// The game. Pure state and rules; no rendering. `tick(dt)` advances the world by dt seconds
// of game time. Everything the UI does goes through the public methods below, and every
// method returns a {ok, reason} so the UI can explain a refusal instead of failing silently.

import { GridMap, GRID, SPAWNS, NO_BUILD_X, assetCells, assetDoors, key, inBounds } from './grid.js';
import { TOWERS, PROGRAMMES, ACTIONS, ECONOMY, IMPACT } from './catalog.js';
import { matchThreats } from './data.js';
import { planWaves, HOURS, campaignAt } from './waves.js';
import { makeRng } from './rng.js';

const SCAN_SECONDS = 6;
const RESCAN_EVERY = 45;
const LATERAL_EVERY = 30;
const LATERAL_EVERY_TRUSTED = 10;
const LATERAL_ID = 'T1021 lateral movement';
const HONEYPOT_ID = 'honeypot';
const SUPPLY_CHAIN_ID = 'supply chain: malicious update';
export const TARGET_MODES = ['danger', 'first', 'strongest', 'boss'];

export class Game {
  constructor({ model, org, seed = 1, difficulty = 1 }) {
    this.model = model;
    this.org = org;
    this.seed = seed;
    this.difficulty = difficulty;
    this.currentYear = +String(model.day).slice(0, 4);
    this.rng = makeRng(seed);
    this.map = new GridMap();
    this.time = 0;
    this.hour = 0;
    this.phase = 'prep';
    this.phaseTimer = ECONOMY.firstPrepSeconds;
    this.budget = org.budget;
    this.impact = 0;
    this.programmes = new Set();
    this.activeFrom = new Map();   // programme id -> hour it takes effect
    this.fixAt = new Map();        // vuln id -> hour the vendor fix becomes available
    this.towers = [];
    this.walls = new Map();
    this.attackers = [];
    this.jobs = [];
    this.events = [];
    this.effects = [];       // transient, drained by the renderer
    this.popups = [];        // transient on-map verdicts {x, y, text, kind}, drained by the UI
    this.nextId = 1;
    this.spawnCursor = 0;
    this.scanClock = 0;
    this.stats = {
      spent: 0, earned: 0, blocked: 0, arrived: 0, exploitsLanded: 0, probesRepelled: 0, overrides: 0, failedChanges: 0, arrivalsThisHour: 0, killsByType: {}, trafficCost: 0, supplyEvents: 0, supplyBlocked: 0, trapped: 0,
      compromises: 0, lateralBlocked: 0, lured: 0, patched: 0, restored: 0,
      downtimeSeconds: 0, compromisedSeconds: 0, firstCompromiseHour: null,
      responseTimes: [], patchDelays: [],
    };

    // Assets: copy templates into live state and tie each to today's rows.
    this.assets = new Map();
    this.threatsByAsset = {};
    this.assetsByVuln = new Map();
    for (const tpl of org.assets) {
      const threats = matchThreats(model, tpl);
      this.threatsByAsset[tpl.id] = threats;
      const a = {
        ...tpl,
        threats,
        vulns: new Set(),       // currently exploitable
        latent: new Map(),      // vulnId -> hour it becomes exploitable
        knownVulns: null,       // null = never scanned; Set once scanned (may be stale)
        scannedAt: null,
        discovered: !tpl.shadow,
        integrity: 100,
        state: 'ok',            // ok | compromised | isolated | maintenance | responding | replacing
        edr: false,
        job: null,
        compromisedAt: null,
        compromisedBy: null,
        lateralTimer: LATERAL_EVERY * 0.5,
        vulnerableSince: null,
        hits: 0,
        isolatedFor: 0,
        compromisedFor: 0,
        scanStale: false,
      };
      for (const v of threats) {
        if (!this.assetsByVuln.has(v.id)) this.assetsByVuln.set(v.id, []);
        this.assetsByVuln.get(v.id).push(a);
      }
      this.assets.set(a.id, a);
      for (const [x, y] of assetCells(a)) this.map.block(x, y, 1);
    }
    this.rollVulnerabilities();
    this.waves = planWaves({ model, org, threatsByAsset: this.threatsByAsset, rng: this.rng, difficulty });
    this.supplyChain = this.rollSupplyChain();
    this.totalRevenue = org.assets.reduce((s, a) => s + a.revenue, 0) || 1;
    this.log(`Day starts. ${org.name}: ${org.assets.length} systems, $${org.budget}k, ${model.totalIps.toLocaleString()} sources on the wire today.`, 'info');
  }

  // Which matched threats are actually exploitable on this org today. Older CVEs are more
  // likely to have been patched already; the newest are the least likely. At least a third
  // of the threatened systems are left exploitable so there is always something to do.
  rollVulnerabilities() {
    const rng = this.rng;
    const threatened = [...this.assets.values()].filter((a) => a.threats.length);
    for (const a of threatened) {
      const cands = a.threats.slice(0, 3);
      for (const v of cands) {
        const p = v.year >= 2025 ? 0.4 : v.year >= 2021 ? 0.22 : 0.12;
        const cap = a.vulns.size === 0 ? 1 : rng.chance(0.25) ? 2 : 1;
        if (rng.chance(p) && a.vulns.size < cap) a.vulns.add(v.id);
      }
      if (a.shadow && a.vulns.size === 0 && cands.length) a.vulns.add(cands[0].id);
    }
    // Between a quarter and two fifths of the threatened systems are exploitable today.
    const need = Math.max(2, Math.ceil(threatened.length * 0.3));
    const most = Math.max(need, Math.ceil(threatened.length * 0.4));
    let have = threatened.filter((a) => a.vulns.size).length;
    for (const a of rng.shuffle(threatened)) {
      if (have >= need) break;
      if (a.vulns.size === 0 && a.threats.length) { a.vulns.add(a.threats[0].id); have++; }
    }
    for (const a of rng.shuffle(threatened)) {
      if (have <= most) break;
      if (a.vulns.size && !a.shadow) { a.vulns.clear(); have--; }
    }
    // One or two threats that turn exploitable mid-day (a new build, a new exploit chain).
    const latentCands = threatened.filter((a) => a.threats.some((v) => v.year >= 2025 && !a.vulns.has(v.id)));
    for (const a of rng.shuffle(latentCands).slice(0, 3)) {
      const v = a.threats.find((x) => x.year >= 2025 && !a.vulns.has(x.id));
      if (v) a.latent.set(v.id, rng.int(7, 15));
    }
    for (const a of threatened) if (a.vulns.size) a.vulnerableSince = 0;
    // Recently published CVEs with no dated fix in the corpus: the vendor fix lands later today.
    for (const a of threatened) for (const vid of a.vulns) { const v = this.vuln(vid); if (v.fixPending && !this.fixAt.has(vid)) this.fixAt.set(vid, rng.int(6, 14)); }
  }

  // One or two supply-chain events a day: a malicious update or a breached vendor lands
  // straight on an internal system, no attacker walks there. Trusted channels first.
  rollSupplyChain() {
    const rng = this.rng;
    // Trusted channels and internal systems of moderate criticality; the crown jewels are
    // reached through them, not directly.
    const cands = [...this.assets.values()].filter((a) => a.trusted || (!a.exposed && a.crit <= 2));
    const trusted = cands.filter((a) => a.trusted);
    const n = this.org.id !== 'startup' && rng.chance(0.4) ? 2 : 1;
    const events = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const pool = (i === 0 && trusted.length ? trusted : cands).filter((a) => !used.has(a.id));
      if (!pool.length) break;
      const a = rng.pick(pool); used.add(a.id);
      events.push({ hour: rng.int(5, 20), assetId: a.id, at: 8 + rng.int(0, 30), vendor: a.product.split(/[ /]/)[0], fired: false, warned: false });
    }
    return events.sort((x, y) => x.hour - y.hour);
  }
  tickSupplyChain() {
    for (const ev of this.supplyChain) {
      if (ev.fired || ev.hour !== this.hour || this.phase !== 'wave' || this.phaseTimer < ev.at) continue;
      ev.fired = true;
      const a = this.asset(ev.assetId);
      if (!a) continue;
      if (this.has('vetting')) { this.log(`Supply-chain vetting blocked a malicious ${ev.vendor} update bound for ${a.name}.`, 'good', { assetId: a.id }); this.fx('vetted', a.x + 1, a.y + 1); this.stats.supplyBlocked++; continue; }
      if (a.state === 'isolated' || a.state === 'compromised' || a.state === 'responding' || a.state === 'replacing') { this.log(`A malicious ${ev.vendor} update reached ${a.name} but it was not running.`, 'warn', { assetId: a.id }); continue; }
      this.discover(a, 'a malicious update');
      this.fx('supplychain', a.x + 1, a.y + 1);
      this.stats.supplyEvents++;
      this.damage(a, 110, { vuln: SUPPLY_CHAIN_ID, ip: `${ev.vendor} update server` }, null);
      if (a.state !== 'compromised') this.log(`Malicious ${ev.vendor} update on ${a.name}: EDR contained most of it.`, 'warn', { assetId: a.id });
    }
  }
  // ---------- helpers ----------
  log(text, level = 'info', extra = {}) {
    this.events.push({ t: this.time, hour: this.hour, clock: this.clock(), text, level, ...extra });
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }
  fx(type, x, y, extra = {}) { this.effects.push({ type, x, y, ...extra }); }
  popup(x, y, text, kind = 'info') { this.popups.push({ x, y, text, kind, t: this.time }); if (this.popups.length > 60) this.popups.splice(0, this.popups.length - 60); }
  clock() {
    const inHour = this.phase === 'wave' ? Math.min(59, Math.floor(this.phaseTimer / ECONOMY.waveSeconds * 60)) : 0;
    const h = Math.min(24, this.hour);
    return `${String(h).padStart(2, '0')}:${String(inHour).padStart(2, '0')}`;
  }
  has(p) { return this.programmes.has(p) && (this.activeFrom.get(p) ?? 0) <= this.hour; }
  bought(p) { return this.programmes.has(p); }
  fixHour(vid) { const h = this.fixAt.get(vid); return h !== undefined && h > this.hour ? h : null; }
  jobSpeed() { return 1 - (this.bought('soc1') ? 0.15 : 0) - (this.bought('soc2') ? 0.15 : 0); }
  businessHours() { const [a, b] = ACTIONS.businessHours; return this.hour >= a && this.hour < b; }
  concurrency() { return 1 + (this.bought('soc1') ? 1 : 0) + (this.bought('soc2') ? 1 : 0); }
  activeJobs() { return this.jobs.filter((j) => j.kind !== 'scan').length; }
  vuln(id) { return this.model.byId.get(id); }
  asset(id) { return this.assets.get(id); }
  sensorBonus() { return this.has('awareness') ? 1 : 0; }
  hourlyIncome() {
    let operating = 0;
    for (const a of this.assets.values()) if (a.state === 'ok') operating += a.revenue;
    const base = this.org.income * (operating / this.totalRevenue);
    return Math.round(base * (this.bought('briefing') && this.hour > this.briefingHour ? 1.15 : 1));
  }
  // Every source that reaches an exposed system costs triage time and bandwidth, patched or not.
  trafficCost(income) {
    return Math.round(income * Math.min(ECONOMY.trafficCostCap, this.stats.arrivalsThisHour * ECONOMY.trafficCostPerArrival));
  }
  spend(n) { this.budget -= n; this.stats.spent += n; }
  exposedTargets(includeIsolated = false) {
    return [...this.assets.values()].filter((a) => a.exposed && (includeIsolated || a.state !== 'isolated'));
  }

  // ---------- placement ----------
  canPlace(type, x, y) {
    const t = TOWERS[type];
    if (!t) return { ok: false, reason: 'Unknown tool' };
    if (!inBounds(x, y)) return { ok: false, reason: 'Off the map' };
    if (x <= NO_BUILD_X) return { ok: false, reason: 'Nothing can be built on the internet side of the demarcation' };
    if (!this.map.isFree(x, y)) return { ok: false, reason: 'Cell is occupied' };
    if (this.budget < t.cost) return { ok: false, reason: `Needs $${t.cost}k` };
    for (const a of this.attackers) if (a.cx === x && a.cy === y) return { ok: false, reason: 'Traffic on this cell' };
    // Reachability: every uplink must still reach every exposed system.
    this.map.block(x, y, 9);
    let cut = null;
    outer: for (const a of this.assets.values()) {
      if (!a.exposed) continue;
      const f = this.map.field(a.id, assetDoors(a, this.map.blocked));
      for (const s of SPAWNS) for (const row of s.rows) if (!this.map.reachable(f, s.x, row)) { cut = a; break outer; }
    }
    this.map.free(x, y);
    if (cut) return { ok: false, reason: `Would cut every route from ${cut.discovered ? cut.name : 'an unmanaged system'} to the internet. Isolate it instead.` };
    return { ok: true };
  }
  place(type, x, y) {
    const c = this.canPlace(type, x, y);
    if (!c.ok) return c;
    const t = TOWERS[type];
    this.spend(t.cost);
    if (type === 'wall') {
      this.map.block(x, y, 3);
      this.walls.set(key(x, y), { x, y });
      return { ok: true };
    }
    const tower = { id: this.nextId++, type, x, y, level: 0, cooldown: 0, target: null, fired: 0, blocked: 0, revealed: 0, mode: 'danger' };
    this.towers.push(tower);
    this.map.block(x, y, 2);
    this.log(`${t.name} deployed at ${x},${y}.`, 'build');
    return { ok: true, tower };
  }
  towerAt(x, y) { return this.towers.find((t) => t.x === x && t.y === y) || null; }
  setMode(towerId, mode) {
    const t = this.towers.find((x) => x.id === towerId);
    if (!t || t.type !== 'ips') return { ok: false, reason: 'Only an IPS has a targeting mode' };
    if (!TARGET_MODES.includes(mode)) return { ok: false, reason: 'Unknown mode' };
    t.mode = mode;
    return { ok: true };
  }
  towerRange(t) {
    const lv = TOWERS[t.type].levels[t.level];
    return lv.range || 0;
  }
  upgrade(towerId) {
    const t = this.towers.find((x) => x.id === towerId);
    if (!t) return { ok: false, reason: 'No such tower' };
    const def = TOWERS[t.type];
    const lv = def.levels[t.level];
    if (!lv.upgrade || t.level >= def.levels.length - 1) return { ok: false, reason: 'Already at the top level' };
    if (this.budget < lv.upgrade) return { ok: false, reason: `Needs $${lv.upgrade}k` };
    this.spend(lv.upgrade);
    t.level++;
    this.log(`${def.name} at ${t.x},${t.y} upgraded to level ${t.level + 1}.`, 'build');
    return { ok: true };
  }
  sell(towerId) {
    const i = this.towers.findIndex((x) => x.id === towerId);
    if (i < 0) return { ok: false, reason: 'No such tower' };
    const t = this.towers[i];
    const def = TOWERS[t.type];
    let paid = def.cost;
    for (let l = 0; l < t.level; l++) paid += def.levels[l].upgrade;
    const refund = Math.round(paid * ECONOMY.refundOnSell);
    this.budget += refund;
    this.towers.splice(i, 1);
    this.map.free(t.x, t.y);
    this.log(`${def.name} decommissioned, $${refund}k recovered.`, 'build');
    return { ok: true, refund };
  }
  removeWall(x, y) {
    const k = key(x, y);
    if (!this.walls.has(k)) return { ok: false, reason: 'No segment there' };
    this.walls.delete(k);
    this.map.free(x, y);
    this.budget += Math.round(TOWERS.wall.cost * TOWERS.wall.sell);
    return { ok: true };
  }

  // ---------- programmes ----------
  buy(id) {
    const p = PROGRAMMES[id];
    if (!p) return { ok: false, reason: 'Unknown programme' };
    if (p.perAsset) return { ok: false, reason: 'Pick a system for that' };
    if (this.programmes.has(id)) return { ok: false, reason: 'Already in place' };
    if (p.requires && !this.programmes.has(p.requires)) return { ok: false, reason: `Needs ${PROGRAMMES[p.requires].name} first` };
    if (this.budget < p.cost) return { ok: false, reason: `Needs $${p.cost}k` };
    this.spend(p.cost);
    this.programmes.add(id);
    if (p.deployHours) this.activeFrom.set(id, this.hour + p.deployHours);
    if (id === 'briefing') this.briefingHour = this.hour;
    if (id === 'discovery') {
      for (const a of this.assets.values()) if (!a.discovered) this.discover(a, 'asset discovery');
    }
    if (id === 'scanner') this.log('Vulnerability scanner online. Scanning inventory, one system at a time.', 'info');
    this.log(p.deployHours ? `${p.name} funded; in effect from ${String(this.hour + p.deployHours).padStart(2, '0')}:00.` : `${p.name} in place.`, 'build');
    return { ok: true };
  }
  installEdr(assetId) {
    const a = this.asset(assetId);
    if (!a || !a.discovered) return { ok: false, reason: 'Not in inventory' };
    if (!a.canEdr) return { ok: false, reason: 'No agent runs on this appliance' };
    if (a.edr) return { ok: false, reason: 'Already protected' };
    if (a.state === 'compromised' || a.state === 'responding') return { ok: false, reason: 'Respond to the incident first' };
    const r = this.startJob(a, { kind: 'edr', cost: PROGRAMMES.edr.cost, seconds: PROGRAMMES.edr.seconds });
    if (!r.ok) return r;
    this.log(`Deploying EDR on ${a.name} (${PROGRAMMES.edr.seconds}s).`, 'build', { assetId: a.id });
    return { ok: true };
  }
  discover(a, how) {
    if (a.discovered) return;
    a.discovered = true;
    this.log(`Unmanaged system found by ${how}: ${a.name} (${a.product}).`, 'warn', { assetId: a.id });
    this.fx('discover', a.x + 1, a.y + 1);
  }

  // ---------- asset actions ----------
  startJob(a, job) {
    if (this.activeJobs() >= this.concurrency()) return { ok: false, reason: `All ${this.concurrency()} engineer${this.concurrency() > 1 ? 's are' : ' is'} busy. Add a SOC shift or wait.` };
    if (a.job) return { ok: false, reason: `${a.name} already has work in progress` };
    if (this.budget < job.cost) return { ok: false, reason: `Needs $${job.cost}k` };
    this.spend(job.cost);
    job.seconds = Math.round(job.seconds * this.jobSpeed());
    job.total = job.seconds; job.remaining = job.seconds; job.assetId = a.id;
    a.job = job;
    this.jobs.push(job);
    return { ok: true };
  }
  patch(assetId, vulnId, emergency = false) {
    const a = this.asset(assetId);
    if (!a || !a.discovered) return { ok: false, reason: 'Not in inventory' };
    const v = this.vuln(vulnId);
    if (!v) return { ok: false, reason: 'Unknown vulnerability' };
    if (!a.threats.includes(v)) return { ok: false, reason: `${a.name} does not run that product` };
    if (!v.patchable) return { ok: false, reason: 'The vendor publishes no fix for this line. Replace or isolate it.' };
    const fh = this.fixHour(vulnId);
    if (fh !== null) return { ok: false, reason: `No vendor fix yet: expected around ${String(fh).padStart(2, '0')}:00. Isolate it, segment it, or virtual-patch with a WAF/IPS meanwhile.` };
    if (!a.vulns.has(vulnId) && !a.latent.has(vulnId)) return { ok: false, reason: 'Already at a fixed version' };
    if (a.state === 'compromised' || a.state === 'responding') return { ok: false, reason: 'Respond to the incident first' };
    if (a.state === 'maintenance' || a.state === 'replacing') return { ok: false, reason: 'Already in a change window' };
    let cost = ACTIONS.patchCost(a);
    let seconds = ACTIONS.patchSeconds(a);
    let cab = false;
    if (emergency) { cost = Math.round(cost * ACTIONS.emergencyMultiplier); seconds = Math.round(seconds * ACTIONS.emergencySecondsFactor); }
    else if (this.businessHours() && a.crit === 3 && a.revenue > 0) { seconds += ACTIONS.cabDelaySeconds; cab = true; }
    const r = this.startJob(a, { kind: 'patch', vulnId, emergency, cost, seconds, prevState: a.state });
    if (!r.ok) return r;
    if (a.state === 'ok') a.state = 'maintenance';
    this.log(`${emergency ? 'Emergency change' : 'Change window'}: patching ${vulnId} on ${a.name} (${a.job.seconds}s${cab ? ', incl. change-board approval in business hours' : ''}).`, 'build', { assetId: a.id });
    return { ok: true };
  }
  replace(assetId) {
    const a = this.asset(assetId);
    if (!a || !a.discovered) return { ok: false, reason: 'Not in inventory' };
    if (a.state === 'compromised' || a.state === 'responding') return { ok: false, reason: 'Respond to the incident first' };
    if (a.job) return { ok: false, reason: 'Work already in progress' };
    const r = this.startJob(a, { kind: 'replace', cost: ACTIONS.replaceCost(a), seconds: ACTIONS.replaceSeconds, prevState: a.state });
    if (!r.ok) return r;
    a.state = 'replacing';
    this.log(`Replacing ${a.name} (${a.product}) with a supported model (${a.job.seconds}s). It is offline until then.`, 'build', { assetId: a.id });
    return { ok: true };
  }
  isolate(assetId, on) {
    const a = this.asset(assetId);
    if (!a || !a.discovered) return { ok: false, reason: 'Not in inventory' };
    if (on) {
      if (a.state !== 'ok') return { ok: false, reason: `Cannot isolate while ${a.state}` };
      if (this.budget < ACTIONS.isolateCost) return { ok: false, reason: `Needs $${ACTIONS.isolateCost}k for the change ticket` };
      this.spend(ACTIONS.isolateCost);
      a.state = 'isolated'; a.isolatedFor = 0; a.overrideWarned = false;
      let committed = 0;
      for (const at of this.attackers) {
        if (at.targetId !== a.id) continue;
        // Anything this close is already mid-exploit; pulling the cable now does not save you.
        if (Math.hypot(at.x - a.x - 0.5, at.y - a.y - 0.5) <= ACTIONS.commitRadius) { at.committed = true; committed++; }
        else this.retarget(at);
      }
      this.log(`${a.name} taken offline ($${ACTIONS.isolateCost}k change ticket)${committed ? `; ${committed} source${committed > 1 ? 's' : ''} already inside the window` : ''}.`, 'warn', { assetId: a.id });
    } else {
      if (a.state !== 'isolated') return { ok: false, reason: 'Not isolated' };
      if (a.isolatedFor < ACTIONS.isolateMinSeconds) return { ok: false, reason: `Offline for at least ${ACTIONS.isolateMinSeconds}s: ${Math.ceil(ACTIONS.isolateMinSeconds - a.isolatedFor)}s to go` };
      a.state = 'ok';
      this.log(`${a.name} back online.`, 'info', { assetId: a.id });
    }
    this.map.fields.clear();
    return { ok: true };
  }
  irPlan(a, withPatch = false) {
    const f = this.bought('retainer') ? 0.5 : 1;
    const rebuild = this.has('backups') ? 1 : 2; // no tested backup: rebuild from scratch, twice the time
    let seconds = Math.round(ACTIONS.irSeconds(a) * f * rebuild), cost = Math.round(ACTIONS.irCost(a) * f);
    const patchVulns = withPatch ? [...a.vulns].filter((vid) => { const v = this.vuln(vid); return v && v.patchable && this.fixHour(vid) === null; }) : [];
    if (patchVulns.length) { seconds += Math.round(ACTIONS.patchSeconds(a) * 0.6); cost += ACTIONS.patchCost(a); }
    return { seconds, cost, patchVulns };
  }
  respond(assetId, withPatch = false) {
    const a = this.asset(assetId);
    if (!a || !a.discovered) return { ok: false, reason: 'Not in inventory' };
    if (a.state !== 'compromised') return { ok: false, reason: 'No incident on this system' };
    const plan = this.irPlan(a, withPatch);
    const r = this.startJob(a, { kind: 'ir', cost: plan.cost, seconds: plan.seconds, patchVulns: plan.patchVulns });
    if (!r.ok) return r;
    a.state = 'responding';
    this.log(`Incident response on ${a.name} (${a.job.seconds}s${this.has('backups') ? ', restoring from tested backup' : ', rebuilding from scratch: no tested backup'}${plan.patchVulns.length ? ', then patching' : ''}). Lateral movement from it stops.`, 'build', { assetId: a.id });
    return { ok: true };
  }

  // ---------- flow ----------
  startHourEarly() {
    if (this.phase !== 'prep') return { ok: false, reason: 'Not in preparation' };
    const bonus = this.attackers.length ? 0 : Math.round(Math.min(this.phaseTimer, ECONOMY.prepSeconds) * ECONOMY.earlyCallBonusPerSecond);
    this.budget += bonus; this.stats.earned += bonus;
    this.log(bonus ? `Hour called early: +$${bonus}k.` : 'Hour called early while sources are still on the map: no bonus.', 'info');
    this.beginWave();
    return { ok: true, bonus };
  }
  beginWave() {
    this.phase = 'wave';
    this.phaseTimer = 0;
    this.spawnCursor = 0;
    this.stats.arrivalsThisHour = 0;
    const w = this.waves[this.hour];
    const next = this.waves[this.hour + 1];
    for (const ev of this.supplyChain) if (!ev.warned && ev.hour === this.hour + 1 && this.has('intel')) { ev.warned = true; const a = this.asset(ev.assetId); this.log(`Threat intel: reports of a compromised ${ev.vendor} update circulating. ${a ? a.name + ' takes updates from it.' : ''}`, 'warn', { assetId: ev.assetId }); }
    if (next && next.campaign && !w.campaign && this.has('intel')) { const fv = this.vuln(next.featured); this.log(`Threat intel: a campaign against ${fv ? fv.vendor + ' ' + fv.product : 'your stack'} (${next.featured}) starts at ${String(this.hour + 1).padStart(2, '0')}:00 and runs three hours.`, 'warn'); }
    const feat = w.featured ? this.vuln(w.featured) : null;
    this.log(`${String(this.hour).padStart(2, '0')}:00 - ${w.n} sources incoming${feat ? `, led by ${feat.id} (${feat.vendor} ${feat.product})` : ''}${w.surge ? '. SURGE: a persistent scanner leads it.' : w.campaign ? '. CAMPAIGN against your stack.' : '.'}`, w.surge || w.campaign ? 'warn' : 'info');
    for (const a of this.assets.values()) {
      for (const [vid, h] of a.latent) if (h <= this.hour) {
        a.latent.delete(vid); a.vulns.add(vid);
        if (a.knownVulns) a.scanStale = true;
        if (a.vulnerableSince === null) a.vulnerableSince = this.hour;
        if (!this.fixAt.has(vid)) this.fixAt.set(vid, this.hour + this.rng.int(3, 6));
        // Design event (see help): a new exploit chain works against this build. A honeypot
        // sees the working exploit; threat intel names the product; otherwise you find out the hard way.
        if (this.towers.some((t) => t.type === 'honeypot')) this.log(`Honeypot caught a working exploit for ${vid}. ${a.name} runs ${a.product}: rescan it.`, 'warn', { assetId: a.id });
        else if (this.has('intel')) this.log(`Threat intel: a new exploit chain for ${vid} is circulating. ${a.name} runs ${a.product}.`, 'warn', { assetId: a.id });
      }
    }
  }
  endWave() {
    this.hour++;
    if (this.hour >= HOURS) { this.phase = 'final'; this.phaseTimer = 0; return; }
    const gross = this.hourlyIncome();
    const cost = this.trafficCost(gross);
    const inc = gross - cost;
    this.budget += inc; this.stats.earned += inc; this.stats.trafficCost += cost;
    this.phase = 'prep';
    this.phaseTimer = ECONOMY.prepSeconds;
    this.log(`Hour ${this.hour} budget: +$${inc}k from operations${cost ? ` ($${cost}k lost to ${this.stats.arrivalsThisHour} sources that reached your systems)` : ''}.`, 'info');
  }
  previewWave(h = this.hour) {
    if (!this.has('intel') || h >= HOURS) return null;
    const w = this.waves[h];
    const agg = new Map();
    for (const s of w.attackers) {
      const e = agg.get(s.vuln) || { vuln: this.vuln(s.vuln), n: 0, boss: false };
      e.n++; if (s.boss) e.boss = true;
      agg.set(s.vuln, e);
    }
    const rows = [...agg.values()].map((e) => {
      const targets = (this.assetsByVuln.get(e.vuln.id) || []).filter((a) => a.discovered);
      const dangerous = targets.some((a) => a.knownVulns && a.knownVulns.has(e.vuln.id));
      return { ...e, targets, relevance: dangerous ? 'danger' : targets.length ? 'stack' : 'noise' };
    });
    rows.sort((a, b) => (b.relevance === 'danger') - (a.relevance === 'danger') || (b.relevance === 'stack') - (a.relevance === 'stack') || b.n - a.n);
    return { hour: h, n: w.n, surge: w.surge, campaign: w.campaign, featured: w.featured, rows };
  }

  // ---------- main loop ----------
  tick(dt) {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.time += dt;
    if (this.phase === 'prep') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.beginWave();
    } else if (this.phase === 'wave') {
      this.phaseTimer += dt;
      this.spawnDue();
      if (this.phaseTimer >= ECONOMY.waveSeconds && this.spawnCursor >= this.waves[this.hour].attackers.length) this.endWave();
    } else if (this.phase === 'final') {
      this.phaseTimer += dt;
      if (this.attackers.length === 0 || this.phaseTimer > 60) { this.phase = 'won'; this.log('24:00 - the day is over.', 'info'); return; }
    }
    this.tickSupplyChain();
    this.tickScanner(dt);
    this.tickJobs(dt);
    this.tickAssets(dt);
    this.tickTowers(dt);
    this.tickAttackers(dt);
    if (this.impact >= IMPACT.loseAt) {
      this.impact = IMPACT.loseAt; this.phase = 'lost';
      this.log('Business impact exceeded what the company can absorb. The regulator has been called.', 'fail');
    }
  }

  spawnDue() {
    const w = this.waves[this.hour];
    const progress = Math.min(1, this.phaseTimer / ECONOMY.spawnWindow);
    while (this.spawnCursor < w.attackers.length && w.attackers[this.spawnCursor].t <= progress) {
      this.spawn(w.attackers[this.spawnCursor++]);
    }
  }
  spawn(s) {
    const sp = SPAWNS[s.spawn];
    const y0 = sp.rows[s.row ?? 1];
    const v = this.vuln(s.vuln);
    const a = {
      id: this.nextId++, vuln: s.vuln, ip: s.ip, hp: s.hp, maxHp: s.hp, speed: s.speed, boss: s.boss,
      kind: 'scan', x: sp.x, y: y0, cx: sp.x, cy: y0, nx: sp.x, ny: y0, targetId: null,
      revealed: false, slow: 1, alive: true, web: v.web, age: 0, lured: false, arrived: false,
    };
    this.chooseTarget(a);
    this.attackers.push(a);
  }
  chooseTarget(a) {
    const matched = (this.assetsByVuln.get(a.vuln) || []).filter((x) => x.exposed && x.state !== 'isolated');
    const pool = matched.length ? matched : this.exposedTargets();
    const all = pool.length ? pool : this.exposedTargets(true);
    a.targetId = all.length ? this.rng.pick(all).id : null;
    a.relevant = matched.length > 0;
  }
  retarget(a) { a.lured = false; this.chooseTarget(a); }

  spawnLateral(from) {
    const cands = [...this.assets.values()].filter((x) => x.id !== from.id && x.state !== 'isolated' && x.state !== 'compromised' && x.state !== 'responding');
    const doors = assetDoors(from, this.map.blocked);
    if (!doors.length || !cands.length) return;
    const start = this.rng.pick(doors);
    const reachable = cands.filter((x) => this.map.reachable(this.map.field(x.id, assetDoors(x, this.map.blocked)), start[0], start[1]));
    if (!reachable.length) return;
    const target = this.rng.pick(reachable);
    const exploit = [...target.vulns][0] || null;
    const a = {
      id: this.nextId++, vuln: exploit || LATERAL_ID, ip: `10.${this.rng.int(0, 255)}.${this.rng.int(0, 255)}.${this.rng.int(2, 254)}`,
      hp: Math.round(28 + 2.5 * this.hour), maxHp: 0, speed: 1.15, boss: false, kind: 'lateral',
      x: start[0], y: start[1], cx: start[0], cy: start[1], nx: start[0], ny: start[1], targetId: target.id,
      revealed: this.has('awareness'), slow: 1, alive: true, web: false, age: 0, lured: false, arrived: false, relevant: true, fromId: from.id,
    };
    a.maxHp = a.hp; if (a.revealed) a.revealedBy = 'staff report';
    this.attackers.push(a);
    this.fx('lateral', start[0], start[1]);
  }

  tickScanner(dt) {
    if (!this.has('scanner')) return;
    let job = this.jobs.find((j) => j.kind === 'scan');
    if (!job) {
      const next = [...this.assets.values()].find((a) => a.discovered && (a.knownVulns === null || a.rescan));
      if (next) { job = { kind: 'scan', assetId: next.id, total: SCAN_SECONDS, remaining: SCAN_SECONDS }; this.jobs.push(job); }
      else if (this.has('scanner2')) {
        this.scanClock += dt;
        if (this.scanClock >= RESCAN_EVERY) { this.scanClock = 0; for (const a of this.assets.values()) a.rescan = true; }
      }
      return;
    }
    job.remaining -= dt;
    if (job.remaining <= 0) {
      const a = this.asset(job.assetId);
      const before = a.lastScanKey || '';
      a.knownVulns = new Set(a.vulns); a.scannedAt = this.time; a.scanClock = this.clock(); a.rescan = false; a.scanStale = false;
      a.lastScanKey = [...a.vulns].sort().join(',');
      this.jobs.splice(this.jobs.indexOf(job), 1);
      if (a.vulns.size && a.lastScanKey !== before) this.log(`Scan: ${a.name} is exploitable via ${[...a.vulns].join(', ')}.`, 'warn', { assetId: a.id });
      else if (!a.vulns.size && before) this.log(`Scan: ${a.name} is clean.`, 'good', { assetId: a.id });
    }
  }

  tickJobs(dt) {
    for (const job of this.jobs.slice()) {
      if (job.kind === 'scan') continue;
      job.remaining -= dt;
      if (job.remaining > 0) continue;
      const a = this.asset(job.assetId);
      this.jobs.splice(this.jobs.indexOf(job), 1);
      a.job = null;
      if (job.kind === 'edr') {
        a.edr = true;
        this.log(`EDR active on ${a.name}.`, 'good', { assetId: a.id });
        continue;
      }
      if (job.kind === 'patch') {
        const failP = a.appliance ? ACTIONS.emergencyFailChanceAppliance : ACTIONS.emergencyFailChance;
        if (job.emergency && !job.failed && this.rng.chance(failP)) {
          job.failed = true; job.remaining = Math.round(ACTIONS.patchSeconds(a) * this.jobSpeed()); job.total = job.remaining; a.job = job; this.jobs.push(job);
          a.state = 'down'; this.stats.failedChanges++;
          this.log(`Emergency change on ${a.name} FAILED. It is down, still exploitable, and the change is being redone properly (${Math.round(job.remaining)}s).`, 'fail', { assetId: a.id });
          continue;
        }
        a.vulns.delete(job.vulnId); a.latent.delete(job.vulnId);
        (a.patchedVulns = a.patchedVulns || new Set()).add(job.vulnId);
        if (a.knownVulns) a.knownVulns.delete(job.vulnId);
        if (a.state === 'maintenance' || a.state === 'down') a.state = 'ok';
        this.stats.patched++;
        if (a.vulns.size === 0 && a.vulnerableSince !== null) { this.stats.patchDelays.push(this.hour - a.vulnerableSince); a.vulnerableSince = null; }
        this.log(`${a.name} patched against ${job.vulnId}.`, 'good', { assetId: a.id });
        this.fx('patched', a.x + 1, a.y + 1);
      } else if (job.kind === 'replace') {
        a.vulns.clear(); a.latent.clear(); a.threats = []; a.knownVulns = new Set();
        a.product = a.product + ' (replaced)'; a.state = 'ok'; a.integrity = 100;
        this.log(`${a.name} replaced with a supported device.`, 'good', { assetId: a.id });
      } else if (job.kind === 'ir') {
        a.state = 'ok'; a.integrity = 100; a.compromisedBy = null; a.compromisedFor = 0;
        this.stats.restored++;
        this.stats.responseTimes.push(this.time - a.compromisedAt);
        a.compromisedAt = null;
        for (const vid of job.patchVulns || []) { a.vulns.delete(vid); if (a.knownVulns) a.knownVulns.delete(vid); this.stats.patched++; }
        const stillOpen = a.vulns.size > 0;
        this.log(`${a.name} ${this.has('backups') ? 'restored from tested backup' : 'rebuilt from scratch'}${(job.patchVulns || []).length ? ' and patched' : ''}, back on the network${stillOpen ? ' - STILL EXPLOITABLE via ' + [...a.vulns].join(', ') : ''}.`, stillOpen ? 'warn' : 'good', { assetId: a.id });
        this.fx('restored', a.x + 1, a.y + 1);
      }
    }
  }

  tickAssets(dt) {
    for (const a of this.assets.values()) {
      const beforeAssetImpact=this.impact;
      if (a.state === 'ok' && a.integrity < 100 && this.time - (a.lastHitAt || -99) > 8) a.integrity = Math.min(100, a.integrity + 0.3 * dt);
      if (a.state === 'compromised') {
        a.compromisedFor += dt;
        // Escalates: every game hour a system stays compromised, the hourly cost doubles.
        this.impact += IMPACT.perSecondCompromised * a.crit * (1 + a.compromisedFor / IMPACT.secondsPerHour) * dt;
        this.stats.compromisedSeconds += dt;
        a.lateralTimer -= dt;
        if (a.lateralTimer <= 0) {
          a.lateralTimer = (a.trusted ? LATERAL_EVERY_TRUSTED : LATERAL_EVERY) * (this.has('awareness') ? 1.25 : 1);
          this.spawnLateral(a);
        }
      } else if (a.state === 'isolated') {
        this.impact += IMPACT.perSecondIsolated * (1 + a.revenue / 10) * dt;
        this.stats.downtimeSeconds += dt;
        a.isolatedFor += dt;
        // The business tolerates a revenue system offline for two hours, then overrides you.
        if (a.revenue >= 3) {
          if (!a.overrideWarned && a.isolatedFor > ACTIONS.isolationOverrideSeconds * 0.7) { a.overrideWarned = true; this.log(`${a.name} has been offline for ${(a.isolatedFor / IMPACT.secondsPerHour).toFixed(1)}h. The business wants it back within the hour.`, 'warn', { assetId: a.id }); }
          if (a.isolatedFor > ACTIONS.isolationOverrideSeconds) { a.state = 'ok'; a.isolatedFor = 0; this.stats.overrides++; this.map.fields.clear(); this.log(`${a.name} forced back online by the business${a.vulns.size ? ' - still exploitable' : ''}.`, 'fail', { assetId: a.id }); }
        }
      } else if (a.state === 'replacing' || a.state === 'down') {
        this.impact += IMPACT.perSecondIsolated * (1 + a.revenue / 10) * dt;
        this.stats.downtimeSeconds += dt;
      } else if (a.state === 'maintenance') {
        this.impact += IMPACT.perSecondMaintenance * a.crit * dt;
        this.stats.downtimeSeconds += dt;
      }
      this.noteAssetImpact?.(a,this.impact-beforeAssetImpact,a.locked?'Ransomware':a.supplySource?'Supply chain':'Downtime',true);
    }
  }

  tickTowers(dt) {
    for (const t of this.towers) {
      const def = TOWERS[t.type];
      const lv = def.levels[t.level];
      const range = this.towerRange(t);
      const r2 = range * range;
      if (t.type === 'ndr') {
        for (const a of this.attackers) {
          const d2 = (a.x - t.x) ** 2 + (a.y - t.y) ** 2;
          if (d2 <= r2 && !a.revealed) { a.revealed = true; a.revealedBy = 'ndr'; }
        }
        for (const a of this.assets.values()) {
          if (a.discovered) continue;
          if ((a.x + 0.5 - t.x) ** 2 + (a.y + 0.5 - t.y) ** 2 <= r2) this.discover(a, 'network sensor');
        }
      } else if (t.type === 'ips') {
        t.cooldown -= dt;
        if (t.cooldown > 0) continue;
        const buffed = this.towers.some((n) => n.type === 'ndr' && n.level >= 1 && (n.x - t.x) ** 2 + (n.y - t.y) ** 2 <= this.towerRange(n) ** 2);
        let best = null, bestScore = -Infinity;
        for (const a of this.attackers) {
          if (!a.alive) continue;
          const d2 = (a.x - t.x) ** 2 + (a.y - t.y) ** 2;
          if (d2 > r2) continue;
          const target = this.asset(a.targetId);
          const danger = target && target.vulns.has(a.vuln) ? 2 : 0;
          let score;
          switch (t.mode) {
            case 'first': score = -(a.dist ?? 99); break;
            case 'strongest': score = a.hp; break;
            case 'boss': score = (a.boss ? 1000 : 0) + a.hp; break;
            default: score = (a.revealed ? 4 : 0) + danger + (a.boss ? 1 : 0) - (a.dist ?? 0) * 0.01;
          }
          if (score > bestScore) { bestScore = score; best = a; }
        }
        t.target = best ? best.id : null;
        if (!best) continue;
        let dmg = lv.damage;
        if (!best.revealed && t.level < 2) dmg *= 0.5;
        if (best.web) dmg *= 0.45;                       // HTTP-layer exploits are the WAF's job
        if (best.boss && t.level < 2) dmg *= 0.5;        // persistent scanners are evasive
        // Signatures lag the newest exploits: this year's CVEs mostly go through until level 3.
        const bv = this.vuln(best.vuln);
        if (bv && bv.year >= this.currentYear) dmg *= t.level >= 2 ? 0.7 : 0.35;
        if (buffed) dmg *= 1.25;
        t.cooldown = lv.interval;
        t.fired++;
        this.hit(best, dmg, t);
      } else if (t.type === 'waf') {
        for (const a of this.attackers) {
          if (!a.web) continue;
          const d2 = (a.x - t.x) ** 2 + (a.y - t.y) ** 2;
          if (d2 > r2) continue;
          a.slow = Math.min(a.slow, lv.slow);
          a.hp -= lv.dot * dt;
          a.wafHit = true;
          if (a.hp <= 0) this.kill(a, t);
        }
      } else if (t.type === 'honeytoken') {
        t.cooldown -= dt;
        if (t.cooldown > 0) continue;
        let best = null, bd = Infinity;
        for (const a of this.attackers) {
          if (a.boss || !a.alive) continue;
          const d2 = (a.x - t.x) ** 2 + (a.y - t.y) ** 2;
          if (d2 <= r2 && d2 < bd) { bd = d2; best = a; }
        }
        if (!best) continue;
        best.revealed = true; best.revealedBy = 'honeytoken'; t.revealed++; t.cooldown = lv.cooldown;
        this.stats.trapped++;
        this.fx('trapped', best.x, best.y);
        this.kill(best, t);
      }
    }
  }
  hit(a, dmg, tower) {
    a.hp -= dmg;
    if (!a.revealed) { a.revealed = true; a.revealedBy = 'ips'; }
    this.fx('shot', tower.x, tower.y, { to: a.id, tx: a.x, ty: a.y, control: tower.type });
    if (a.hp <= 0) this.kill(a, tower);
  }
  kill(a, tower) {
    if (!a.alive) return;
    a.alive = false;
    this.stats.blocked++;
    if (tower) { tower.blocked++; this.stats.killsByType[tower.type] = (this.stats.killsByType[tower.type] || 0) + 1; }
    this.fx('kill', a.x, a.y, { boss: a.boss });
  }

  tickAttackers(dt) {
    for (const a of this.attackers) {
      if (!a.alive) continue;
      a.age += dt;
      a.slowRecover = true;
      // Field for the current target.
      const target = this.asset(a.targetId);
      if (!target) { a.alive = false; continue; }
      const field = this.map.field(target.id, assetDoors(target, this.map.blocked));
      a.dist = field[key(a.cx, a.cy)];
      if (a.dist < 0) {
        // Boxed in (map changed under it). Try another target; give up if nothing is reachable.
        this.retarget(a);
        const t2 = this.asset(a.targetId);
        const f2 = t2 ? this.map.field(t2.id, assetDoors(t2, this.map.blocked)) : null;
        if (!f2 || f2[key(a.cx, a.cy)] < 0) { a.alive = false; a.gaveUp = true; continue; }
        continue;
      }
      // Move toward the next cell.
      if (a.cx === a.nx && a.cy === a.ny) {
        const s = this.map.step(field, a.cx, a.cy);
        if (!s) { this.arrive(a); continue; }
        a.nx = s[0]; a.ny = s[1];
      }
      const spd = a.speed * a.slow;
      const dx = a.nx - a.x, dy = a.ny - a.y;
      const d = Math.hypot(dx, dy);
      const stepLen = spd * dt;
      if (d <= stepLen) { a.x = a.nx; a.y = a.ny; a.cx = a.nx; a.cy = a.ny; }
      else { a.x += (dx / d) * stepLen; a.y += (dy / d) * stepLen; }
      a.slow = Math.min(1, a.slow + dt * 0.5); // slow decays once out of WAF range; WAF re-applies each tick
    }
    this.attackers = this.attackers.filter((a) => a.alive);
  }

  arrive(a) {
    a.alive = false; a.arrived = true;
    this.stats.arrived++;
    if (a.kind === 'scan') this.stats.arrivalsThisHour++;
    const target = this.asset(a.targetId);
    if (!target) return;
    const v = this.vuln(a.vuln);
    if ((target.state === 'isolated' && !a.committed) || target.state === 'maintenance' || target.state === 'replacing') { this.stats.probesRepelled++; this.fx('refused', target.x + 1, target.y + 1); this.popup(target.x + 1, target.y + 1, target.state === 'isolated' ? 'offline' : 'in maintenance', 'refused'); return; }
    // 'down' (a failed emergency change) is NOT immune: the box is half-configured and still listening.
    if (target.state === 'compromised' || target.state === 'responding') { this.fx('refused', target.x + 1, target.y + 1); this.popup(target.x + 1, target.y + 1, 'already compromised', 'refused'); return; }
    if (a.kind === 'lateral' && a.vuln === LATERAL_ID) {
      let p = 0.6;
      if (target.edr) p *= 0.3;
      if (this.has('mfa')) p *= 0.5;
      if (this.has('awareness')) p *= 0.8;
      const from = this.asset(a.fromId);
      if (target.x >= 23 && from && from.x < 23) p *= 0.5; // the core is a second hop from the perimeter
      if (!this.rng.chance(p)) { this.stats.lateralBlocked++; this.fx('refused', target.x + 1, target.y + 1); this.popup(target.x + 1, target.y + 1, target.edr ? 'blocked by EDR' : this.has('mfa') ? 'blocked by MFA' : 'credentials failed', 'good'); this.log(`Lateral movement into ${target.name} blocked${target.edr ? ' by EDR' : this.has('mfa') ? ' by MFA' : ''}.`, 'good', { assetId: target.id }); return; }
      this.damage(target, 55, a, null);
      return;
    }
    if (!target.vulns.has(a.vuln)) {
      this.stats.probesRepelled++; this.fx('probe', target.x + 1, target.y + 1); target.hits++;
      const wasPatched = target.patchedVulns && target.patchedVulns.has(a.vuln);
      this.popup(target.x + 1, target.y + 1, wasPatched ? 'patched: no effect' : a.relevant ? 'not exploitable' : 'wrong product', 'probe');
      return;
    }
    const strength = Math.sqrt(Math.max(0, a.hp) / a.maxHp);
    let dmg = (45 + (v ? v.severity : 7.5) * 6) * strength;
    if (a.boss) dmg *= 1.5;
    this.damage(target, dmg, a, v);
  }
  damage(target, dmg, a, v) {
    if (target.edr) dmg *= 0.4;
    target.integrity -= dmg; target.lastHitAt = this.time;
    this.stats.exploitsLanded++;
    this.fx('exploit', target.x + 1, target.y + 1, { dmg });
    if (target.integrity <= 0) { this.popup(target.x + 1, target.y + 1, 'COMPROMISED', 'fail'); this.compromise(target, a, v); }
    else { this.popup(target.x + 1, target.y + 1, `HIT -${Math.round(dmg)}%${target.edr ? ' (EDR)' : ''}`, 'hit'); this.log(`${target.name} hit by ${a.vuln} from ${a.ip}: integrity ${Math.round(target.integrity)}%.`, 'warn', { assetId: target.id }); }
  }
  compromise(target, a, v) {
    target.integrity = 0;
    target.state = 'compromised';
    target.compromisedAt = this.time; target.compromisedFor = 0;
    target.compromisedBy = a.vuln;
    target.lateralTimer = LATERAL_EVERY * 0.4;
    if (target.job) { this.jobs.splice(this.jobs.indexOf(target.job), 1); target.job = null; }
    if (target.trusted) this.log(`${target.name} is a trusted channel: everything that takes updates from it is now reachable.`, 'fail', { assetId: target.id });
    this.stats.compromises++;
    if (this.stats.firstCompromiseHour === null) this.stats.firstCompromiseHour = this.hour;
    let hit = IMPACT.compromiseBase * target.crit;
    if (a.vuln === SUPPLY_CHAIN_ID) hit *= 1.25; // it came in signed and trusted
    const ransom = v && v.ransomware;
    if (ransom) hit *= this.has('backups') ? 1 : IMPACT.ransomwareMultiplier;
    if (target.crit === 3 && !target.exposed) hit += IMPACT.crownJewelBreach;
    this.impact += hit;
    this.discover(target, 'the attacker');
    this.map.fields.clear();
    this.log(`${target.name} COMPROMISED via ${a.vuln} from ${a.ip}${ransom ? ' (ransomware-linked)' : ''}. Impact +${hit.toFixed(0)}.`, 'fail', { assetId: target.id });
    this.fx('compromise', target.x + 1, target.y + 1);
    for (const at of this.attackers) if (at.targetId === target.id && at.kind === 'scan') this.retarget(at);
  }

  // ---------- read model for the UI ----------
  // Everything the CISO owns, counted, for the organisation dashboard.
  inventory() {
    const towers = {};
    for (const t of this.towers) { const k = t.type; towers[k] = towers[k] || { count: 0, levels: [0, 0, 0], blocked: 0, revealed: 0 }; towers[k].count++; towers[k].levels[t.level]++; towers[k].blocked += t.blocked; towers[k].revealed += t.revealed || 0; }
    const assets = { total: 0, discovered: 0, exposed: 0, ok: 0, compromised: 0, isolated: 0, maintenance: 0, edr: 0, exploitable: 0, knownExploitable: 0, unscanned: 0 };
    for (const a of this.assets.values()) {
      assets.total++; if (a.discovered) assets.discovered++; if (a.exposed) assets.exposed++;
      if (a.state === 'ok') assets.ok++; else if (a.state === 'compromised' || a.state === 'responding') assets.compromised++; else if (a.state === 'isolated') assets.isolated++; else assets.maintenance++;
      if (a.edr) assets.edr++; if (a.vulns.size) assets.exploitable++; if (a.knownVulns && a.knownVulns.size) assets.knownExploitable++; if (a.discovered && a.knownVulns === null) assets.unscanned++;
    }
    const programmes = [...this.programmes].map((id) => ({ id, active: this.has(id), from: this.activeFrom.get(id) ?? null }));
    return { towers, walls: this.walls.size, assets, programmes, engineers: this.concurrency(), busy: this.activeJobs(), budget: this.budget, spent: this.stats.spent, earned: this.stats.earned, income: this.hourlyIncome() };
  }
  attackerIntel(a) {
    const v = this.vuln(a.vuln);
    const target = this.asset(a.targetId);
    const ndr3 = this.towers.some((t) => t.type === 'ndr' && t.level >= 2);
    if (!a.revealed) return { label: 'unidentified', level: 'unknown', v, target };
    if (a.kind === 'lateral') return { label: a.vuln, level: 'danger', v, target };
    if (!target) return { label: a.vuln, level: 'noise', v, target };
    const known = target.knownVulns;
    if (target.vulns.has(a.vuln) && (ndr3 || (known && known.has(a.vuln)))) return { label: a.vuln, level: 'danger', v, target };
    if (a.relevant) return { label: a.vuln, level: known ? 'stack-clean' : 'stack', v, target };
    return { label: a.vuln, level: 'noise', v, target };
  }
  // One number everybody gets, comparable across companies: how far you got, how little it
  // hurt, how much you actually blocked, weighted by the company's difficulty.
  score() {
    const s = this.stats;
    const hours = Math.min(HOURS, this.hour) + (this.phase === 'wave' ? Math.min(1, this.phaseTimer / ECONOMY.waveSeconds) : 0);
    const survival = (this.phase === 'lost' ? 1500 : 3000) * (hours / HOURS);
    const health = this.phase === 'lost' ? 0 : 3000 * Math.max(0, 1 - this.impact / IMPACT.loseAt);
    const defence = Math.min(1500, 4 * s.blocked + 6 * s.lateralBlocked + 60 * s.patched + 40 * s.restored);
    const clean = this.phase === 'won' && s.compromises === 0 ? 1500 : 0;
    const mult = this.org.scoreMultiplier || 1;
    return Math.round((survival + health + defence + clean) * mult);
  }
  rank(score = this.score()) {
    return score >= 13500 ? 'Legendary CISO' : score >= 10500 ? 'Board-ready' : score >= 7500 ? 'Solid operator' : score >= 4500 ? 'Survivor' : score >= 2000 ? 'Breached' : 'Regulator\'s guest';
  }
  grade() {
    if (this.phase === 'lost') return 'F';
    const i = this.impact;
    return i < 8 ? 'A' : i < 20 ? 'B' : i < 40 ? 'C' : i < 70 ? 'D' : 'E';
  }
  scorecard() {
    const s = this.stats;
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const score = this.score();
    return {
      grade: this.grade(), score, rank: this.rank(score), orgMultiplier: this.org.scoreMultiplier || 1, difficultyLabel: this.org.difficultyLabel || '',
      impact: this.impact, hoursSurvived: this.hour, won: this.phase === 'won',
      spent: s.spent, earned: s.earned, budgetLeft: this.budget,
      blocked: s.blocked, arrived: s.arrived, exploitsLanded: s.exploitsLanded, probesRepelled: s.probesRepelled,
      compromises: s.compromises, restored: s.restored, patched: s.patched, lateralBlocked: s.lateralBlocked, killsByType: s.killsByType, trafficCost: s.trafficCost, supplyEvents: s.supplyEvents, supplyBlocked: s.supplyBlocked, trapped: s.trapped,
      downtimeHours: s.downtimeSeconds / IMPACT.secondsPerHour, compromisedHours: s.compromisedSeconds / IMPACT.secondsPerHour, overrides: s.overrides, failedChanges: s.failedChanges,
      mttrHours: avg(s.responseTimes) === null ? null : avg(s.responseTimes) / IMPACT.secondsPerHour, meanPatchDelayHours: avg(s.patchDelays), firstCompromiseHour: s.firstCompromiseHour,
      stillVulnerable: [...this.assets.values()].filter((a) => a.vulns.size && a.state !== 'isolated').map((a) => a.name),
      undiscovered: [...this.assets.values()].filter((a) => !a.discovered).map((a) => a.name),
    };
  }
}

export { LATERAL_ID, HONEYPOT_ID, SUPPLY_CHAIN_ID, GRID, HOURS };
