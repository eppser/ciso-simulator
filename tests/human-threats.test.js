import {describe,it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
const mk=(org='startup')=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],seed:20260902});
const funded=(g,id)=>{g.programmes.add(id);g.programReady.set(id,g.time);};
const advance=(g,seconds)=>{for(let n=0;n<seconds;n++){g.time++;g.tickHumanThreats(1);g.tickJobs(1);g.recordScoreState();}};

describe('human threat incidents',()=>{
 it.each(['startup','midcap','enterprise'])('starts clean and schedules once after preparation: %s',org=>{
  const g=mk(org);g.tickHumanThreats(1);expect(g.humanThreats).toHaveLength(0);
  g.hour=g.pacing.fraudHour;g.tickHumanThreats(1);g.tickHumanThreats(1);expect(g.humanThreats.map(t=>t.kind)).toEqual(['worker-fraud']);
  g.hour=g.pacing.insiderHour;g.tickHumanThreats(1);expect(g.humanThreats.map(t=>t.kind)).toEqual(['worker-fraud','insider']);
 });
 it('unconfirmed source stays out of public status and map effects',()=>{
  const g=mk(),a=g.asset('db');a.discovered=false;const t=g.startHumanThreat('worker-fraud',a);g.effects=[];g.tickHumanThreats(1);
  expect(g.humanThreatStatus()[0].assetId).toBe(null);expect(g.effects).toHaveLength(0);expect(g.containHumanThreat(t.id).ok).toBe(false);
  advance(g,45);expect(t.detectedAt).toBe(45);expect(a.discovered).toBe(true);expect(g.humanThreatStatus()[0].assetId).toBe(a.id);
 });
 it('fraud drains real budget and impact without masquerading as defense spend',()=>{
  const g=mk(),t=g.startHumanThreat('worker-fraud'),budget=g.budget,spent=g.stats.spent;advance(g,10);
  expect(g.budget).toBeCloseTo(budget-.78);expect(t.budgetLost).toBeCloseTo(.78);expect(g.stats.fraudLoss).toBeCloseTo(.78);
  expect(t.impact).toBeCloseTo(.052);expect(g.impact).toBeCloseTo(.052);expect(g.stats.spent).toBe(spent);expect(g.scoreEvidence().net).toBeCloseTo(.78);
 });
 it('never drains below zero and still offers free containment with all engineers busy',()=>{
  const g=mk(),t=g.startHumanThreat('worker-fraud');g.budget=.01;advance(g,45);expect(g.budget).toBe(0);
  g.jobs=Array.from({length:g.concurrency()},()=>({kind:'programme'}));expect(g.containHumanThreat(t.id).ok).toBe(true);
  const impact=g.impact;g.time+=30;g.tickHumanThreats(30);expect(g.impact).toBe(impact);expect(g.budget).toBe(0);
 });
 it('active hiring verification prevents fraud; unfinished rollout does not',()=>{
  const g=mk();funded(g,'hiring');expect(g.startHumanThreat('worker-fraud').state).toBe('prevented');expect(g.performance.prevented).toBe(1);expect(g.performance.incidents).toHaveLength(0);advance(g,100);expect(g.stats.fraudLoss||0).toBe(0);
  const h=mk();h.programmes.add('hiring');h.programReady.set('hiring',40);const t=h.startHumanThreat('worker-fraud');expect(t.state).toBe('active');advance(h,45);expect(t.state).toBe('active');
 });
 it('awareness improves reporting but cannot verify identity by itself',()=>{
  const g=mk();funded(g,'training');g.rng.chance=()=>false;const t=g.startHumanThreat('worker-fraud');expect(t.state).toBe('active');advance(g,22);expect(t.detectedAt).toBe(22);
  const h=mk();funded(h,'training');h.rng.chance=()=>true;expect(h.startHumanThreat('worker-fraud').state).toBe('prevented');
 });
 it('SIEM accelerates identification and PAM reduces insider harm',()=>{
  const a=mk(),b=mk();funded(b,'awareness');funded(b,'pam');const ta=a.startHumanThreat('insider'),tb=b.startHumanThreat('insider');advance(a,10);advance(b,10);
  expect(ta.detectedAt).toBe(null);expect(tb.detectedAt).toBe(8);expect(tb.impact).toBeCloseTo(ta.impact*.3);expect(tb.budgetLost).toBeCloseTo(ta.budgetLost*.3);
 });
 it('containment stops loss but resolution requires an actual paid engineer job',()=>{
  const g=mk(),t=g.startHumanThreat('worker-fraud');g.detectHumanThreat(t.id);expect(g.investigateHumanThreat(t.id).ok).toBe(false);
  expect(g.containHumanThreat(t.id).ok).toBe(true);const budget=g.budget;expect(g.investigateHumanThreat(t.id).ok).toBe(true);
  expect(g.budget).toBe(budget-g.price(8));expect(g.activeJobs()).toBe(1);expect(t.state).toBe('investigating');advance(g,24);expect(t.state).toBe('investigating');advance(g,2);expect(t.state).toBe('resolved');
  expect(g.activeJobs()).toBe(0);expect(g.humanThreatStatus()).toHaveLength(0);expect(g.performance.incidents[0].closedAt).toBe(25);
 });
 it('repeated actions cannot farm credits, duplicate jobs, or incident scores',()=>{
  const g=mk(),t=g.startHumanThreat('worker-fraud');g.detectHumanThreat(t.id);g.containHumanThreat(t.id);g.investigateHumanThreat(t.id);
  const spent=g.stats.spent,budget=g.budget;expect(g.containHumanThreat(t.id).ok).toBe(false);expect(g.investigateHumanThreat(t.id).ok).toBe(false);expect(g.startHumanThreat('worker-fraud')).toBe(false);
  expect(g.stats.spent).toBe(spent);expect(g.budget).toBe(budget);advance(g,30);expect(g.finishHumanThreat(t.id)).toBe(false);expect(g.performance.incidents).toHaveLength(1);expect(g.stats.workerFraudResolved).toBe(1);
 });
 it('interrupted work remains contained, refunds once and can be reassigned',()=>{
  const g=mk(),t=g.startHumanThreat('insider');g.detectHumanThreat(t.id);g.containHumanThreat(t.id);const budget=g.budget;g.investigateHumanThreat(t.id);
  const host=g.asset(t.jobHostId);g.jobs=[];host.job=null;g.tickHumanThreats(1);expect(t.state).toBe('contained');expect(g.budget).toBe(budget);g.tickHumanThreats(1);expect(g.budget).toBe(budget);
  expect(g.investigateHumanThreat(t.id).ok).toBe(true);advance(g,30);expect(t.state).toBe('resolved');expect(g.stats.spent-g.stats.refunded).toBe(g.price(8));
 });
 it('human incidents cannot be scored closed merely because the building is healthy',()=>{
  const g=mk(),t=g.startHumanThreat('insider');g.recordScoreState();const i=g.performance.incidents[0];expect(i.closedAt).toBe(null);expect(i.containedAt).toBe(null);
  g.time=10;g.detectHumanThreat(t.id);g.time=15;g.containHumanThreat(t.id);expect(i.detectedAt).toBe(10);expect(i.containedAt).toBe(15);expect(i.closedAt).toBe(null);
 });
 it('offline access stops recurring harm without silently resolving the incident',()=>{
  const g=mk(),a=g.asset('db'),t=g.startHumanThreat('insider',a);a.quarantined=true;advance(g,50);
  expect(t.detectedAt).not.toBe(null);expect(t.budgetLost).toBe(0);expect(t.impact).toBe(0);expect(t.state).toBe('active');
  a.quarantined=false;advance(g,5);expect(t.impact).toBeGreaterThan(0);g.containHumanThreat(t.id);advance(g,5);expect(t.state).toBe('contained');
 });
 it('evidence completion never repairs a compromised or encrypted building',()=>{
  const g=mk(),t=g.startHumanThreat('insider');g.detectHumanThreat(t.id);g.containHumanThreat(t.id);g.investigateHumanThreat(t.id);
  const host=g.asset(t.jobHostId);host.state='compromised';host.locked=true;host.integrity=0;
  advance(g,30);expect(t.state).toBe('resolved');expect(host.state).toBe('compromised');expect(host.locked).toBe(true);expect(host.integrity).toBe(0);
 });
 it('an unaffordable investigation keeps access contained and consumes no engineer',()=>{
  const g=mk(),t=g.startHumanThreat('worker-fraud');g.detectHumanThreat(t.id);g.containHumanThreat(t.id);g.budget=0;
  expect(g.investigateHumanThreat(t.id).ok).toBe(false);expect(g.activeJobs()).toBe(0);expect(t.state).toBe('contained');advance(g,60);expect(t.impact).toBe(0);
 });
 it('an encryption outage inventories a hidden machine without tracing its covert incidents',()=>{
  const g=mk('midcap'),a=g.asset('db')||[...g.assets.values()].find(a=>a.personalData&&!a.exposed);
  a.discovered=false;g.startLeak(a);const t=g.startHumanThreat('insider',a);
  g.detonate({assetId:g.identityId,triggered:false});
  expect(a.locked).toBe(true);expect(a.discovered).toBe(true);expect(a.leak.detected).toBe(false);expect(t.detectedAt).toBe(null);
  expect(g.humanThreatStatus()[0].assetId).toBe(null);expect(g.cleanLeak(a.id).ok).toBe(false);
 });
 it('a faster response scores better than leaving the same incident unresolved',()=>{
  const fast=mk(),slow=mk();for(const g of [fast,slow]){g.hour=4;const t=g.startHumanThreat('insider');g.detectHumanThreat(t.id);if(g===fast){g.containHumanThreat(t.id);g.investigateHumanThreat(t.id);}advance(g,40);}
  expect(fast.scoreEvidence().response).toBeGreaterThan(slow.scoreEvidence().response);expect(fast.score()).toBeGreaterThan(slow.score());expect(slow.impact).toBeGreaterThan(fast.impact);
 });
});
