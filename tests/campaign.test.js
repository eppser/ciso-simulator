import { describe,it,expect } from 'vitest';
import { Campaign } from '../src/sim/campaign.js';
import { scenarioModel,validateDay,BUILTIN_DAYS } from '../src/sim/scenarios.js';
import { ORGS } from '../src/sim/orgs.js';
import { PROGRAMS } from '../src/sim/campaign-rules.js';
import { SPAWNS } from '../src/sim/grid.js';
import { runCampaign } from '../tools/campaign-autoplay.mjs';
const model=scenarioModel(BUILTIN_DAYS[0]);
const mk=(org='startup',mode='full',seed=20260902)=>new Campaign({model,org:ORGS[org],mode,seed});
const advance=(g,seconds)=>{for(let i=0;i<seconds*10;i++){g.tick(.1);if(g.pendingDilemma){const d=g.pendingDilemma;g.choose(d.id,d.choices.find(c=>c.enabled)?.id);}}};
const quiet=g=>{g.attackers=[];g.waves.forEach(w=>w.attackers=[]);g.supplyChain=[];g.flags.nextPasswordAt=Infinity;};
describe('production source adapter',()=>{
 it('preserves every observation and disambiguates CVE/product rows',()=>{expect(model.vulns).toHaveLength(726);expect(model.byId.size).toBe(726);expect(model.totalConnections).toBe(107025);expect(model.totalIps).toBe(7431);});
 it('rejects invalid dates, duplicate tuples and impossible counts',()=>{const d=BUILTIN_DAYS[0];expect(()=>validateDay({...d,day:'2026-02-31'})).toThrow();expect(()=>validateDay({...d,vulnerabilities:[d.vulnerabilities[0],d.vulnerabilities[0]]})).toThrow();expect(()=>validateDay({...d,vulnerabilities:[{id:'x',unique_ips:3,connections:2}]})).toThrow();});
 it('supports other dates and unfamiliar products without assuming a matching estate',()=>{const m=scenarioModel({day:'2026-08-31',source:'Test input',vulnerabilities:[{id:'CUSTOM-1',unique_ips:5,connections:100,vendor:'New vendor',product:'New product'}]});const g=new Campaign({model:m,org:ORGS.startup,seed:1});advance(g,45);expect(Number.isFinite(g.budget)).toBe(true);});
});
describe('production campaign economy and people',()=>{
 it.each(Object.keys(ORGS))('%s has a finite day, three uplinks, increasing sources and an identity system',org=>{const g=mk(org);expect(g.waves).toHaveLength(24);expect(SPAWNS).toHaveLength(3);expect(g.waves[23].n).toBeGreaterThan(g.waves[1].n);expect(g.asset(g.identityId)).toBeTruthy();expect(new Set(g.waves.flatMap(w=>w.attackers.map(a=>a.spawn))).size).toBe(3);});
 it('starts a wave early with no cash bonus',()=>{const g=mk();const b=g.budget;expect(g.startHourEarly().ok).toBe(true);expect(g.budget).toBe(b);});
 it('scaled controls deduct exactly the quoted price, including increasing firewall costs',()=>{const g=mk();g.budget=1000;for(const [type,x,y]of [['ips',7,3],['wall',13,10],['wall',13,11]]){const cost=g.buildCost(type),before=g.budget;expect(g.place(type,x,y).ok).toBe(true);expect(before-g.budget).toBe(cost);}});
 it('starter equipment cannot mint refunds',()=>{const g=mk();expect(g.sell(g.towers[0].id).refund).toBe(0);expect(g.sell(999).ok).toBe(false);});
 it('deployment is timed in simulation seconds',()=>{const g=mk();quiet(g);g.budget=1000;expect(g.buy('mfa').ok).toBe(true);advance(g,79);expect(g.has('mfa')).toBe(false);advance(g,2);expect(g.has('mfa')).toBe(true);});
 it('engineer-led programmes are advanced once and finish',()=>{const g=mk();quiet(g);g.budget=1000;expect(g.buy('outside').ok).toBe(true);advance(g,16);expect(g.has('outside')).toBe(false);expect(g.jobs[0].remaining).toBeCloseTo(14,2);advance(g,15);expect(g.has('outside')).toBe(true);expect(g.jobs.length).toBe(0);});
 it('engineer capacity is enforced and purchased shifts add capacity',()=>{const g=mk();g.budget=1000;expect(g.buy('outside').ok).toBe(true);expect(g.buy('drill').ok).toBe(false);expect(g.buy('soc1').ok).toBe(true);const a=g.asset('laptops');expect(g.installEdr(a.id).ok).toBe(true);expect(g.jobs).toHaveLength(2);});
 it('unplug holds offline, queues the unavailable fix and stops targeting the asset',()=>{const g=mk();g.budget=1000;expect(g.isolate(g.firstAssetId).ok).toBe(true);expect(g.patch(g.firstAssetId,g.firstVulnId).ok).toBe(true);expect(g.asset(g.firstAssetId).queuedFix).toBeTruthy();expect(g.attackers.every(a=>a.targetId!==g.firstAssetId)).toBe(true);quiet(g);advance(g,90);expect(g.asset(g.firstAssetId).state).toBe('isolated');});
 it('isolating identity reduces operating income',()=>{const g=mk();const before=g.hourlyIncome();expect(g.isolate(g.identityId).ok).toBe(true);expect(g.hourlyIncome()).toBeLessThan(before*.51);});
 it('invalid time steps do not corrupt state',()=>{const g=mk();g.tick(NaN);g.tick(-1);g.tick(Infinity);expect(g.time).toBe(0);});
});
describe('response and three-category outcomes',()=>{
 it('payment caps high ranks but never upgrades a poor score',()=>{const g=mk();g.flags.paid=true;expect(g.rank(9999)).toBe('Held the line');expect(g.rank(1000)).toBe('Breached');});
 it.each(Object.keys(ORGS))('a budget-limited strategy completes the default %s day',org=>{const result=runCampaign(org);expect(result.phase).toBe('won');expect(result.seconds).toBeLessThan(1000);expect(result.score).toBeGreaterThan(3000);});
 it('crown reporting cannot deadlock when the only engineer is busy',()=>{const g=mk();g.concurrency=()=>1;quiet(g);g.budget=1000;g.buy('outside');g.detect(g.asset('web'));g.queueDilemma('crown','web',true);expect(g.choose(g.pendingDilemma.id,'file').ok).toBe(true);expect(g.flags.pendingReport).toBe(true);advance(g,55);expect(g.regulator.filed).toBe(true);});
 it('reports take engineer time unless lawyers are funded',()=>{const g=mk();quiet(g);g.regulator={deadline:100,filed:false};expect(g.fileIncident().ok).toBe(true);advance(g,10);expect(g.regulator.filed).toBe(false);advance(g,11);expect(g.regulator.filed).toBe(true);});
 it('ransomware decisions never freeze the simulation and have a free exit',()=>{const g=mk();g.budget=0;g.flags.ransomPrice=33;g.queueDilemma('ransom',null,true);const d=g.pendingDilemma;expect(d.choices.find(c=>c.id==='contain').enabled).toBe(true);const time=g.time;g.tick(10);expect(g.time).toBeGreaterThan(time);expect(g.choose(d.id,'contain').ok).toBe(true);expect(g.paused).toBe(false);});
 it('encrypted systems need tested backups to rebuild',()=>{const g=mk();g.budget=1000;const a=g.asset('db');a.locked=true;a.state='compromised';expect(g.respond(a.id).ok).toBe(false);g.programmes.add('backups');expect(g.respond(a.id).ok).toBe(true);expect(a.job.total).toBe(120);});
 it('forensics completes and files the report',()=>{const g=mk();quiet(g);const a=g.asset('web');g.detect(a);g.queueDilemma('crown',a.id,true);expect(g.choose(g.pendingDilemma.id,'image').ok).toBe(true);advance(g,42);expect(g.regulator.filed).toBe(true);});
 it.each(['shift','full'])('%s terminates and exactly three categories sum to at most 10000',mode=>{const g=mk('startup',mode);quiet(g);advance(g,1100);expect(g.phase).toBe('won');expect(g.hour).toBe(mode==='shift'?6:24);expect(g.time).toBeLessThan(1000);expect(g.scoreBreakdown()).toHaveLength(3);expect(g.score()).toBe(g.scoreBreakdown().reduce((s,c)=>s+c.value,0));expect(g.score()).toBeLessThanOrEqual(10000);});
 it('a full incident-driven day has no NaNs and always offers a decision exit',()=>{const g=mk('enterprise');for(let i=0;i<11000&&!['won','lost'].includes(g.phase);i++){if(g.pendingDilemma){const d=g.pendingDilemma;const choices=d.choices.filter(c=>c.enabled);expect(choices.length).toBeGreaterThan(0);let resolved=false;for(const c of choices)if(g.choose(d.id,c.id).ok){resolved=true;break;}expect(resolved).toBe(true);}else g.tick(.1);expect(Number.isFinite(g.budget)&&Number.isFinite(g.impact)).toBe(true);}expect(['won','lost']).toContain(g.phase);});
});
