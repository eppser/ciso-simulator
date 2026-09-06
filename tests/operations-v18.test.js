import {it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
import {renderOperations,operationsCounts} from '../src/ui/operations-center.js';
const mk=(org='startup')=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],seed:42});
it('optional request can be deferred without spending or losing trust, then reopened',()=>{
 const g=mk();g.requestEvidence();const cash=g.budget;expect(g.deferEvidence().ok).toBe(true);
 expect(g.evidence.state).toBe('deferred');expect(g.budget).toBe(cash);expect(g.trust).toBe(5);
 expect(operationsCounts(g).governance).toBe(0);expect(g.prepareEvidence().ok).toBe(false);
 expect(g.deferEvidence().ok).toBe(true);expect(g.evidence.state).toBe('requested');
});
it('delays vendor nine simulation seconds and cancels a short-lived outbreak',()=>{
 const g=mk(),a=g.asset('db');a.state='compromised';g.tickIncidents(0);
 expect(g.offerDetails()).toBeNull();g.time=8.9;g.tickIncidents(0);expect(g.offerDetails()).toBeNull();
 a.state='ok';g.tickIncidents(0);g.time=20;a.state='compromised';g.tickIncidents(0);expect(g.offerDetails()).toBeNull();
 g.time=29;g.tickIncidents(0);expect(g.offerDetails()).not.toBeNull();
 a.state='ok';g.tickIncidents(0);expect(g.offerDetails()).toBeNull();
});
it.each(Object.keys(ORGS))('%s optional evidence consumes real resources and never cures malware',org=>{
 const g=mk(org),infected=[...g.assets.values()].find(a=>a.crit===3);infected.state='compromised';g.tickIncidents(0);
 expect(g.evidence.state).toBe('requested');const budget=g.budget,impact=g.impact,trust=g.trust;
 expect(g.decideEvidence(true).ok).toBe(false);expect(g.prepareEvidence().ok).toBe(true);
 expect(g.budget).toBeCloseTo(budget-g.price(5));expect(g.activeJobs()).toBe(1);expect(g.prepareEvidence().ok).toBe(false);
 const job=g.jobs.find(j=>j.programme==='liaison-evidence');g.time+=job.remaining+1;g.tickJobs(job.remaining+1);
 expect(g.evidence.state).toBe('ready');expect(g.evidenceReady()).toBe(true);expect(g.activeJobs()).toBe(0);
 expect(g.impact).toBe(impact);expect(g.trust).toBe(trust);expect(infected.state).toBe('compromised');
 g.trust=3;expect(g.decideEvidence(false).ok).toBe(true);expect(g.trust).toBe(3);expect(g.evidenceReady()).toBe(true);
 expect(g.decideEvidence(true).ok).toBe(true);expect(g.trust).toBe(4);expect(g.decideEvidence(true).ok).toBe(false);expect(g.trust).toBe(4);
 g.requestEvidence();expect(g.evidence.state).toBe('shared');
});
it('preserved evidence halves report work without filing or bypassing required reports',()=>{
 const g=mk();g.regulator={deadline:500,filed:false};g.requestEvidence();g.prepareEvidence();
 const j=g.jobs[0];g.time+=j.remaining+1;g.tickJobs(j.remaining+1);expect(g.regulator.filed).toBe(false);
 expect(g.fileIncident().ok).toBe(true);expect(g.jobs.find(j=>j.programme==='report').total).toBe(10);
});
it('interrupted collection is retryable and earns nothing',()=>{
 const g=mk();g.requestEvidence();g.prepareEvidence();const host=g.asset(g.evidence.assetId);g.jobs=[];host.job=null;g.tickEvidence();
 expect(g.evidence.state).toBe('requested');expect(g.evidenceReady()).toBe(false);expect(g.stats.evidencePrepared||0).toBe(0);
});
it('blocks preparation without money, capacity or a healthy host and caps trust',()=>{
 const g=mk();g.requestEvidence();g.budget=0;expect(g.prepareEvidence().ok).toBe(false);g.budget=1000;
 for(const a of g.assets.values())a.state='compromised';expect(g.prepareEvidence().ok).toBe(false);
 g.evidence.state='ready';expect(g.decideEvidence(true).ok).toBe(true);expect(g.trust).toBe(5);
});
it('unified overview exposes tasks, work and optional history without revealing covert sources',()=>{
 const g=mk();let html=renderOperations(g);expect(html).toContain('FIRST STEP');expect(html).toContain('PRIORITY FEED');
 g.hour=4;g.tickGrc();g.requestEvidence();g.startLeak(g.asset('db'));g.log('Test build order','build');
 html=renderOperations(g);expect(html).toContain('Source unknown');expect(html).not.toContain('leak-db');expect(html).toContain('FBI · incident logs');
 expect(operationsCounts(g).governance).toBe(2);expect(html).not.toContain('Test build order');expect(renderOperations(g,1,true)).toContain('Test build order');
});
