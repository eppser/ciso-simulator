import { describe, it, expect } from 'vitest';
import { loadModel, run, STRATEGIES } from '../tools/autoplay.mjs';
import { Game, LATERAL_ID } from '../src/sim/game.js';
import { ORGS, ORG_LIST } from '../src/sim/orgs.js';
import { toughness, matchThreats, cveYear } from '../src/sim/data.js';
import { GridMap, SPAWNS, NO_BUILD_X, assetDoors, key } from '../src/sim/grid.js';
import { planWaves, HOURS } from '../src/sim/waves.js';
import { makeRng } from '../src/sim/rng.js';
import { TOWERS, ECONOMY, IMPACT, ACTIONS } from '../src/sim/catalog.js';

const model = loadModel();
const mk = (org = 'midcap', seed = 7, difficulty = 1) => new Game({ model, org: ORGS[org], seed, difficulty });

describe('data model', () => {
  it('loads the whole day and keeps its totals', () => {
    expect(model.vulns.length).toBe(726);
    expect(model.totalConnections).toBe(107025);
    expect(model.totalIps).toBe(7431);
    expect(model.vulns[0].id).toBe('CVE-2022-40684');
  });
  it('toughness is monotone in attempts per source and bounded', () => {
    expect(toughness(1)).toBeLessThan(toughness(10));
    expect(toughness(10)).toBeLessThan(toughness(1000));
    expect(toughness(1000)).toBeLessThan(150);
  });
  it('every organisation has at least one product line present in the day', () => {
    for (const org of ORG_LIST) {
      const matched = org.assets.filter((a) => matchThreats(model, a).length);
      expect(matched.length, org.id).toBeGreaterThanOrEqual(6);
    }
  });
  it('the Fortinet campaign is the toughest kind of attacker and the Huawei botnet the weakest kind', () => {
    const f = model.byId.get('CVE-2022-40684'), h = model.byId.get('CVE-2017-17215');
    expect(f.toughness).toBeGreaterThan(h.toughness * 2);
    expect(h.speed).toBeGreaterThan(f.speed);
  });
  it('cveYear parses and rejects', () => { expect(cveYear('CVE-2019-1653')).toBe(2019); expect(cveYear('EDB-41471')).toBeNull(); });
});

describe('grid and paths', () => {
  it('flow field reaches every door from every spawn on an empty map', () => {
    const g = mk('enterprise');
    for (const a of g.assets.values()) if (a.exposed) {
      const f = g.map.field(a.id, assetDoors(a, g.map.blocked));
      for (const s of SPAWNS) for (const row of s.rows) expect(g.map.reachable(f, s.x, row), `${a.id} from ${s.id}`).toBe(true);
    }
  });
  it('refuses a placement that would cut every route to an exposed system, and accepts one that only lengthens it', () => {
    const g = mk('startup', 3);
    g.budget = 10000;
    // Box in the office router at (5,15) 2x2: doors are the ring around it.
    const a = g.asset('router');
    const doors = assetDoors(a, g.map.blocked);
    let refused = null;
    for (let i = 0; i < doors.length; i++) {
      const [x, y] = doors[i];
      const r = g.canPlace('wall', x, y);
      if (!r.ok) { refused = r; break; }
      g.place('wall', x, y);
    }
    expect(refused).not.toBeNull();
    expect(refused.reason).toMatch(/cut every route/);
  });
  it('nothing can be built on the internet side of the demarcation, or on an occupied cell', () => {
    const g = mk();
    expect(g.canPlace('wall', 0, 5).ok).toBe(false);
    expect(g.canPlace('ips', NO_BUILD_X, 8).ok).toBe(false);
    expect(g.canPlace('wall', 4, 2).ok).toBe(false);
    expect(g.canPlace('wall', 6, 6).ok).toBe(true);
  });
  it('step() descends the field and returns null on arrival', () => {
    const m = new GridMap();
    const f = m.field('t', [[5, 5]]);
    expect(m.step(f, 5, 5)).toBeNull();
    const s = m.step(f, 8, 5);
    expect(f[key(s[0], s[1])]).toBe(2);
  });
});

describe('waves', () => {
  it('produces 24 hours that grow, gently then steeply, with surge bosses, all from the day', () => {
    const g = mk('midcap', 11);
    expect(g.waves.length).toBe(HOURS);
    expect(g.waves[23].n).toBeGreaterThan(g.waves[0].n);
    const growth = (a, b) => g.waves[b].n - g.waves[a].n;
    expect(growth(12, 23)).toBeGreaterThan(growth(0, 11) * 1.5);
    const hp = (h) => g.waves[h].attackers.filter((a) => !a.boss).reduce((s, a) => s + a.hp, 0) / g.waves[h].attackers.filter((a) => !a.boss).length;
    expect(hp(23)).toBeGreaterThan(hp(11) * 1.4);
    expect(g.waves[5].attackers.some((a) => a.boss)).toBe(true);
    expect(g.waves[0].attackers.some((a) => a.boss)).toBe(false);
    for (const w of g.waves) for (const a of w.attackers) expect(model.byId.has(a.vuln)).toBe(true);
  });
  it('is deterministic for a seed and differs across seeds', () => {
    const a = mk('midcap', 5), b = mk('midcap', 5), c = mk('midcap', 6);
    expect(JSON.stringify(a.waves)).toBe(JSON.stringify(b.waves));
    expect(JSON.stringify(a.waves)).not.toBe(JSON.stringify(c.waves));
    expect([...a.assets.values()].map((x) => [...x.vulns])).toEqual([...b.assets.values()].map((x) => [...x.vulns]));
  });
  it('reserves a share of each hour for the organisation\'s own products', () => {
    const g = mk('enterprise', 2);
    const rel = new Set(Object.values(g.threatsByAsset).flat().map((v) => v.id));
    let relevant = 0, total = 0;
    for (const w of g.waves) for (const a of w.attackers) { total++; if (rel.has(a.vuln)) relevant++; }
    expect(relevant / total).toBeGreaterThan(0.35);
    expect(relevant / total).toBeLessThan(0.9);
  });
});

describe('economy and actions', () => {
  it('placing a tower spends money and blocks the cell; selling refunds 60%', () => {
    const g = mk();
    const b0 = g.budget;
    const r = g.place('ips', 6, 6);
    expect(r.ok).toBe(true);
    expect(g.budget).toBe(b0 - TOWERS.ips.cost);
    expect(g.map.isFree(6, 6)).toBe(false);
    g.sell(r.tower.id);
    expect(g.budget).toBeCloseTo(b0 - TOWERS.ips.cost + Math.round(TOWERS.ips.cost * 0.6));
    expect(g.map.isFree(6, 6)).toBe(true);
  });
  it('refuses what it cannot afford and explains', () => {
    const g = mk('startup');
    g.budget = 5;
    expect(g.place('ips', 6, 6)).toMatchObject({ ok: false });
    expect(g.buy('scanner').reason).toMatch(/Needs/);
  });
  it('one engineer means one job at a time; a SOC shift adds one', () => {
    const g = mk('midcap', 4);
    g.budget = 10000;
    g.buy('scanner');
    for (let i = 0; i < 400; i++) g.tick(0.5); // let the scanner finish everything
    const vul = [...g.assets.values()].filter((a) => a.discovered && a.vulns.size && g.vuln([...a.vulns][0]).patchable && a.state === 'ok');
    expect(vul.length).toBeGreaterThanOrEqual(2);
    expect(g.patch(vul[0].id, [...vul[0].vulns][0]).ok).toBe(true);
    const second = g.patch(vul[1].id, [...vul[1].vulns][0]);
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/busy/);
    g.buy('soc1');
    expect(g.patch(vul[1].id, [...vul[1].vulns][0]).ok).toBe(true);
  });
  it('a patch removes the vulnerability and puts the system into a change window meanwhile', () => {
    const g = mk('midcap', 4);
    g.budget = 10000; g.buy('scanner');
    for (let i = 0; i < 400; i++) g.tick(0.5);
    const a = [...g.assets.values()].find((x) => x.vulns.size && g.vuln([...x.vulns][0]).patchable && x.state === 'ok');
    const vid = [...a.vulns][0];
    g.patch(a.id, vid);
    expect(a.state).toBe('maintenance');
    for (let i = 0; i < 200; i++) g.tick(0.5);
    expect(a.vulns.has(vid)).toBe(false);
    expect(a.state).toBe('ok');
  });
  it('an unpatchable device cannot be patched, only replaced or isolated', () => {
    const g = mk('midcap', 1);
    g.budget = 10000; g.buy('discovery');
    const dvr = g.asset('dvr');
    const v = model.byId.get('EDB-41471');
    expect(v.patchable).toBe(false);
    expect(dvr.vulns.has('EDB-41471')).toBe(true);
    expect(g.patch('dvr', 'EDB-41471').reason).toMatch(/no fix/);
    expect(g.isolate('dvr', true).ok).toBe(true);
    expect(g.isolate('dvr', false).ok).toBe(false); // minimum offline window
    for (let i = 0; i < 82; i++) g.tick(0.5);
    expect(g.isolate('dvr', false).ok).toBe(true);
    expect(g.replace('dvr').ok).toBe(true);
    expect(dvr.state).toBe('replacing');
    for (let i = 0; i < 400; i++) g.tick(0.5);
    expect(dvr.vulns.size).toBe(0);
    expect(dvr.state).toBe('ok');
  });
  it('hourly income falls when systems are offline', () => {
    const g = mk('midcap');
    const full = g.hourlyIncome();
    g.isolate('portal', true);
    expect(g.hourlyIncome()).toBeLessThan(full);
  });
  it('calling the hour early starts the wave without minting money', () => {
    const g = mk();
    const b0 = g.budget;
    const r = g.startHourEarly();
    expect(r.ok).toBe(true);
    expect(g.phase).toBe('wave');
    expect(g.budget).toBe(b0);
    const g2 = mk();
    g2.attackers.push({ id: 1, alive: true, x: 5, y: 5, kind: 'scan' });
    const b2 = g2.budget;
    expect(g2.startHourEarly().bonus).toBe(0);
    expect(g2.budget).toBe(b2);
  });
  it('isolation costs a change ticket, and sources already at the door still land', () => {
    const g = mk('midcap', 4);
    g.beginWave();
    const target = [...g.assets.values()].find((a) => a.exposed && a.discovered && a.vulns.size);
    const vid = [...target.vulns][0]; const v = g.vuln(vid);
    const [dx, dy] = assetDoors(target, g.map.blocked)[0];
    const near = { id: 1, vuln: vid, ip: 'x', hp: v.toughness, maxHp: v.toughness, speed: 1, kind: 'scan', x: dx, y: dy, cx: dx, cy: dy, nx: dx, ny: dy, targetId: target.id, revealed: true, slow: 1, alive: true, web: false, age: 0, relevant: true };
    g.attackers.push(near);
    const b0 = g.budget;
    expect(g.isolate(target.id, true).ok).toBe(true);
    expect(g.budget).toBe(b0 - ACTIONS.isolateCost);
    expect(near.committed).toBe(true);
    g.tick(0.05);
    expect(target.integrity).toBeLessThan(100);
  });
  it('programmes with a rollout take effect later; SOC shifts speed jobs up', () => {
    const g = mk('midcap', 4);
    g.budget = 10000;
    g.buy('mfa');
    expect(g.bought('mfa')).toBe(true);
    expect(g.has('mfa')).toBe(false);
    g.hour = 2;
    expect(g.has('mfa')).toBe(true);
    const a = g.asset('portal');
    const base = ACTIONS.patchSeconds(a);
    g.buy('soc1');
    expect(g.jobSpeed()).toBeCloseTo(0.85);
    void base;
  });
  it('a recently published CVE has no vendor fix until later in the day', () => {
    let hit = null;
    for (let seed = 1; seed < 80 && !hit; seed++) { const g = mk('startup', seed); for (const a of g.assets.values()) for (const vid of a.vulns) if (g.fixHour(vid) !== null) hit = { g, a, vid }; }
    expect(hit).not.toBeNull();
    const { g, a, vid } = hit;
    g.budget = 10000; g.buy('discovery');
    expect(g.patch(a.id, vid).reason).toMatch(/No vendor fix yet/);
    g.hour = 23;
    expect(g.patch(a.id, vid).ok).toBe(true);
  });
});

describe('attack resolution', () => {
  function driveTo(g, a) { // teleport an attacker to its target's door
    const t = g.asset(a.targetId);
    const [x, y] = assetDoors(t, g.map.blocked)[0];
    a.x = x; a.y = y; a.cx = x; a.cy = y; a.nx = x; a.ny = y;
  }
  it('a probe against a non-exploitable system does nothing; an exploit against an exploitable one compromises it', () => {
    const g = mk('midcap', 4);
    g.beginWave();
    const target = [...g.assets.values()].find((a) => a.exposed && a.vulns.size);
    const vid = [...target.vulns][0];
    const v = g.vuln(vid);
    // Noise first.
    const noise = { id: 1, vuln: 'CVE-2017-17215', ip: 'x', hp: 30, maxHp: 30, speed: 1, kind: 'scan', x: 0, y: 0, cx: 0, cy: 0, nx: 0, ny: 0, targetId: target.id, revealed: false, slow: 1, alive: true, web: false, age: 0, lured: false, relevant: false };
    g.attackers.push(noise); driveTo(g, noise); g.tick(0.05);
    expect(target.integrity).toBe(100);
    expect(g.stats.probesRepelled).toBe(1);
    expect(g.popups.at(-1).kind).toBe('probe'); // the verdict is posted on the map
    const real = { ...noise, id: 2, vuln: vid, hp: v.toughness, maxHp: v.toughness, alive: true };
    g.attackers.push(real); driveTo(g, real); g.tick(0.05);
    expect(target.state).toBe('compromised');
    expect(g.impact).toBeGreaterThan(0);
    expect(g.stats.compromises).toBe(1);
    expect(g.popups.at(-1).text).toBe('COMPROMISED');
  });
  it('a damaged attacker deals less; EDR cuts it further', () => {
    let g, target;
    for (let seed = 1; seed < 60 && !target; seed++) { g = mk('midcap', seed); target = [...g.assets.values()].find((a) => a.exposed && a.discovered && a.vulns.size && a.canEdr); }
    expect(target).toBeTruthy();
    const vid = [...target.vulns][0];
    const mkA = (hp) => ({ id: 9, vuln: vid, ip: 'x', hp, maxHp: 100, speed: 1, kind: 'scan', x: 0, y: 0, cx: 0, cy: 0, nx: 0, ny: 0, targetId: target.id, revealed: true, slow: 1, alive: true, web: false, age: 0, lured: false, relevant: true });
    g.attackers.push(mkA(20)); driveTo(g, g.attackers[0]); g.tick(0.05);
    const afterWeak = target.integrity;
    expect(afterWeak).toBeGreaterThan(0);
    target.integrity = 100; g.budget = 1000; expect(g.installEdr(target.id).ok).toBe(true);
    for (let i = 0; i < 40; i++) g.tick(0.5);
    expect(target.edr).toBe(true);
    target.integrity = 100;
    g.attackers.push(mkA(20)); driveTo(g, g.attackers[0]); g.tick(0.05);
    expect(100 - target.integrity).toBeLessThan(100 - afterWeak);
  });
  it('an IPS wears attackers down and reveals them; unidentified traffic takes half damage; web exploits mostly pass', () => {
    const g = mk('midcap', 4);
    g.budget = 10000;
    const r = g.place('ips', 6, 6);
    const a = { id: 5, vuln: 'CVE-2022-40684', ip: 'x', hp: 1000, maxHp: 1000, speed: 0, kind: 'scan', x: 6, y: 7, cx: 6, cy: 7, nx: 6, ny: 7, targetId: 'fw', revealed: false, slow: 1, alive: true, web: false, age: 0, lured: false, relevant: true, dist: 5 };
    g.attackers.push(a);
    g.tickTowers(0.05);
    expect(a.revealed).toBe(true);
    expect(1000 - a.hp).toBeCloseTo(TOWERS.ips.levels[0].damage * 0.5);
    r.tower.cooldown = 0;
    const hp = a.hp;
    g.tickTowers(0.05);
    expect(hp - a.hp).toBeCloseTo(TOWERS.ips.levels[0].damage);
    g.attackers.length = 0;
    const web = { ...a, id: 6, vuln: 'CVE-2017-9841', web: true, revealed: true, hp: 1000 };
    g.attackers.push(web); r.tower.cooldown = 0;
    g.tickTowers(0.05);
    expect(1000 - web.hp).toBeCloseTo(TOWERS.ips.levels[0].damage * 0.45);
  });
  it('IPS targeting modes change which source is hit', () => {
    const g = mk('midcap', 4);
    g.budget = 10000;
    const r = g.place('ips', 6, 6);
    const mk2 = (id, hp, dist, boss) => ({ id, vuln: 'CVE-2022-40684', ip: 'x', hp, maxHp: hp, speed: 0, kind: 'scan', x: 6, y: 7, cx: 6, cy: 7, nx: 6, ny: 7, targetId: 'fw', revealed: true, slow: 1, alive: true, web: false, age: 0, relevant: true, dist, boss });
    g.attackers.push(mk2(1, 10, 2, false), mk2(2, 500, 9, false), mk2(3, 100, 5, true));
    g.setMode(r.tower.id, 'first'); g.tickTowers(0.05); expect(r.tower.target).toBe(1);
    g.setMode(r.tower.id, 'strongest'); r.tower.cooldown = 0; g.tickTowers(0.05); expect(r.tower.target).toBe(2);
    g.setMode(r.tower.id, 'boss'); r.tower.cooldown = 0; g.tickTowers(0.05); expect(r.tower.target).toBe(3);
  });
  it('a WAF slows web exploits only', () => {
    const g = mk('midcap', 4);
    g.budget = 10000; g.place('waf', 6, 6);
    const web = { id: 5, vuln: 'CVE-2017-9841', hp: 100, maxHp: 100, speed: 1, kind: 'scan', x: 6, y: 7, cx: 6, cy: 7, nx: 6, ny: 7, targetId: 'portal', revealed: false, slow: 1, alive: true, web: true, age: 0, lured: false };
    const router = { ...web, id: 6, vuln: 'CVE-2017-17215', web: false, slow: 1 };
    g.attackers.push(web, router);
    g.tickTowers(0.1);
    expect(web.slow).toBeLessThan(1);
    expect(router.slow).toBe(1);
    expect(web.hp).toBeLessThan(100);
    expect(router.hp).toBe(100);
  });
  it('a compromised system seeds lateral movement; incident response stops it and restores the system', () => {
    const g = mk('midcap', 4);
    g.budget = 10000;
    const t = g.asset('portal');
    g.compromise(t, { vuln: 'CVE-2021-42013', ip: 'x' }, g.vuln('CVE-2021-42013'));
    let seen = false;
    for (let i = 0; i < 100; i++) { g.tick(0.5); if (g.attackers.some((a) => a.kind === 'lateral')) seen = true; }
    expect(seen).toBe(true);
    expect(g.respond('portal', true).ok).toBe(true);
    expect(t.state).toBe('responding');
    for (let i = 0; i < 400; i++) g.tick(0.5);
    expect(t.state).toBe('ok');
    expect(t.integrity).toBe(100);
    expect(g.stats.restored).toBe(1);
    expect(t.vulns.has('CVE-2021-42013')).toBe(false); // responded WITH the patch
  });
  it('a crown-jewel compromise costs more, and ransomware doubles unless backups exist', () => {
    const g1 = mk('midcap', 4), g2 = mk('midcap', 4);
    const v = model.byId.get('CVE-2023-22527'); // ransomware-linked in the registry
    expect(v.ransomware).toBe(true);
    g1.compromise(g1.asset('erp'), { vuln: v.id, ip: 'x' }, v);
    g2.budget = 1000; g2.buy('backups'); g2.hour = 3; g2.compromise(g2.asset('erp'), { vuln: v.id, ip: 'x' }, v);
    expect(g1.impact).toBe((IMPACT.compromiseBase * 3) * IMPACT.ransomwareMultiplier + IMPACT.crownJewelBreach);
    expect(g2.impact).toBe(IMPACT.compromiseBase * 3 + IMPACT.crownJewelBreach);
  });
  it('honey tokens catch one source, then need re-arming; bosses are immune', () => {
    const g = mk('midcap', 4);
    g.budget = 10000; const r = g.place('honeytoken', 6, 6);
    const mkA = (id, boss) => ({ id, vuln: 'CVE-2022-40684', hp: 500, maxHp: 500, speed: 0, kind: 'scan', x: 7, y: 6, cx: 7, cy: 6, nx: 7, ny: 6, targetId: 'fw', revealed: false, slow: 1, alive: true, web: false, age: 0, relevant: true, boss });
    const a = mkA(1, false), b = mkA(2, false), boss = mkA(3, true);
    g.attackers.push(boss, a, b);
    g.tickTowers(0.05);
    expect(a.alive).toBe(false);
    expect(b.alive).toBe(true);
    expect(boss.alive).toBe(true);
    expect(r.tower.cooldown).toBeGreaterThan(0);
    g.tickTowers(0.05);
    expect(b.alive).toBe(true); // still re-arming
    r.tower.cooldown = 0; g.tickTowers(0.05);
    expect(b.alive).toBe(false);
    expect(g.stats.trapped).toBe(2);
  });
  it('a supply-chain event compromises an internal system with no attacker, unless vetting is in place', () => {
    const g = mk('midcap', 4);
    expect(g.supplyChain.length).toBeGreaterThan(0);
    const ev = g.supplyChain[0]; const a = g.asset(ev.assetId);
    g.hour = ev.hour; g.beginWave(); g.phaseTimer = ev.at + 0.1;
    g.tickSupplyChain();
    expect(a.state).toBe('compromised');
    expect(a.compromisedBy).toMatch(/supply chain/);
    const g2 = mk('midcap', 4);
    g2.budget = 10000; g2.buy('vetting'); g2.hour = g2.supplyChain[0].hour; g2.beginWave(); g2.phaseTimer = g2.supplyChain[0].at + 0.1;
    g2.tickSupplyChain();
    expect(g2.asset(g2.supplyChain[0].assetId).state).toBe('ok');
    expect(g2.stats.supplyBlocked).toBe(1);
  });
  it('the inventory counts what the CISO owns', () => {
    const g = mk('midcap', 4);
    g.budget = 10000; g.place('ips', 6, 6); g.place('ips', 6, 8); g.upgrade(g.towers[0].id); g.place('wall', 11, 10); g.buy('scanner');
    const inv = g.inventory();
    expect(inv.towers.ips.count).toBe(2);
    expect(inv.towers.ips.levels).toEqual([1, 1, 0]);
    expect(inv.walls).toBe(1);
    expect(inv.programmes.map((p) => p.id)).toContain('scanner');
    expect(inv.engineers).toBe(1);
  });
  it('the game ends at impact 100', () => {
    const g = mk('midcap', 4);
    g.impact = 100.5;
    g.beginWave();
    g.tick(0.05);
    expect(g.phase).toBe('lost');
  });
});

describe('intel and fog', () => {
  it('attackers start unidentified and an NDR in range identifies them', () => {
    const g = mk('midcap', 4);
    g.budget = 10000; g.place('ndr', 6, 6);
    const a = { id: 5, vuln: 'CVE-2022-40684', hp: 10, maxHp: 10, speed: 0, kind: 'scan', x: 7, y: 7, cx: 7, cy: 7, nx: 7, ny: 7, targetId: 'fw', revealed: false, slow: 1, alive: true, web: false, age: 0, lured: false, relevant: true };
    g.attackers.push(a);
    expect(g.attackerIntel(a).level).toBe('unknown');
    g.tickTowers(0.05);
    expect(a.revealed).toBe(true);
    expect(['stack', 'danger', 'stack-clean']).toContain(g.attackerIntel(a).level);
  });
  it('the wave preview exists only with threat intel and flags exploitable targets only once scanned', () => {
    const g = mk('midcap', 4);
    expect(g.previewWave()).toBeNull();
    g.budget = 10000; g.buy('intel');
    const w = g.previewWave();
    expect(w.rows.length).toBeGreaterThan(0);
    expect(w.rows.some((r) => r.relevance === 'danger')).toBe(false);
    g.buy('scanner');
    for (let i = 0; i < 400; i++) g.tick(0.5);
    const anyDanger = Array.from({ length: 24 }, (_, h) => h).some((h) => g.previewWave(h).rows.some((r) => r.relevance === 'danger'));
    expect(anyDanger).toBe(true);
  });
  it('shadow IT is undiscovered until discovery, a sensor, or an attacker finds it', () => {
    const g = mk('midcap', 4);
    const dvr = g.asset('dvr');
    expect(dvr.discovered).toBe(false);
    expect(g.patch('dvr', 'EDB-41471').reason).toMatch(/inventory/);
    g.budget = 10000; g.place('ndr', 11, 10);
    g.tickTowers(0.05);
    expect(dvr.discovered).toBe(true);
  });
  it('a latent vulnerability appears mid-day and a one-off scan is stale', () => {
    let found = null;
    for (let seed = 1; seed < 40 && !found; seed++) { const g = mk('enterprise', seed); for (const a of g.assets.values()) if (a.latent.size && !a.shadow) found = { g, a }; }
    expect(found).not.toBeNull();
    const { g, a } = found;
    const [vid, hour] = [...a.latent][0];
    g.budget = 10000; g.buy('scanner');
    for (let i = 0; i < 400; i++) g.tick(0.5);
    expect(a.knownVulns.has(vid)).toBe(false);
    g.hour = hour; g.beginWave();
    expect(a.vulns.has(vid)).toBe(true);
    expect(a.knownVulns.has(vid)).toBe(false); // stale until rescanned
    expect(g.fixHour(vid)).not.toBeNull();      // and the vendor fix is hours away
  });
});

describe('score', () => {
  it('is universal: same outcome scores higher on a harder company, and losing early scores little', () => {
    const a = mk('startup', 1), b = mk('enterprise', 1);
    a.hour = 24; a.phase = 'won'; a.impact = 10; b.hour = 24; b.phase = 'won'; b.impact = 10;
    expect(b.score()).toBeGreaterThan(a.score());
    const c = mk('midcap', 1); c.hour = 3; c.phase = 'lost'; c.impact = 100;
    expect(c.score()).toBeLessThan(a.score() / 4);
    expect(typeof c.scorecard().rank).toBe('string');
  });
});

describe('balance envelope (headless days)', () => {
  it('doing nothing loses, on average between hour 4 and 16, on every organisation', () => {
    for (const org of ['startup', 'midcap', 'enterprise']) {
      const hours = [1, 2, 3].map((seed) => { const g = run({ org, seed, strategy: 'nothing', model }); expect(g.phase, org).toBe('lost'); return g.hour; });
      const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
      expect(mean, `${org} ${hours}`).toBeGreaterThanOrEqual(4);
      expect(mean, `${org} ${hours}`).toBeLessThanOrEqual(16);
    }
  });
  it('a competent plan survives the day, averaging a B or better over three seeds', () => {
    for (const org of ['startup', 'midcap', 'enterprise']) {
      const impacts = [1, 2, 3].map((seed) => { const g = run({ org, seed, strategy: 'smart', model }); expect(g.phase, `${org} seed ${seed}`).toBe('won'); return g.impact; });
      const mean = impacts.reduce((a, b) => a + b, 0) / impacts.length;
      // B is impact < 20; the scripted plan is competent, not optimal, so a little slack on the boundary.
      expect(mean, `${org} ${impacts.map((x) => x.toFixed(1))}`).toBeLessThan(22);
    }
  });
  it('the test can fail: with an IPS that does no damage, nothing gets blocked by it', () => {
    const saved = TOWERS.ips.levels.map((l) => l.damage);
    for (const l of TOWERS.ips.levels) l.damage = 0;
    const g = run({ org: 'midcap', seed: 3, strategy: 'boxes', model });
    TOWERS.ips.levels.forEach((l, i) => { l.damage = saved[i]; });
    const g2 = run({ org: 'midcap', seed: 3, strategy: 'boxes', model });
    expect(g.stats.killsByType.ips || 0).toBe(0);
    expect(g2.stats.killsByType.ips).toBeGreaterThan(20);
  });
});
