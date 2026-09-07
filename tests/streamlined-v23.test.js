import {it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
import {PROGRAMS,TRACKS} from '../src/sim/campaign-rules.js';
import {assetExposure} from '../src/ui/asset-exposure.js';
import {responseAction} from '../src/ui/response-action.js';
import {renderActionDirectory} from '../src/ui/action-directory.js';
import {operationCards,renderOperations} from '../src/ui/operations-center.js';
const mk=(org='startup')=>new Campaign({org:ORGS[org],model:scenarioModel(BUILTIN_DAYS[0]),seed:42});
it.each(Object.keys(ORGS))('%s never reveals the opening exposure before an inspection',org=>{
 const g=mk(org),a=g.asset(g.firstAssetId);expect(a.vulns.size).toBeGreaterThan(0);
 for(const a of g.assets.values())if(a.discovered)expect(assetExposure(g,a).state).toBe('unknown');
 g.tickScanner(100);expect(a.knownVulns).toBeNull();g.buy('scanner');
 for(let i=0;i<g.assets.size;i++)g.tickScanner(5);
 expect(a.knownVulns.has(g.firstVulnId)).toBe(true);
});
it.each(Object.keys(ORGS))('%s response UI and simulation agree on every blocker and cleanup charges once',org=>{
 const g=mk(org),a=g.asset(g.firstAssetId);a.state='compromised';g.budget=1000;
 expect(g.responseEligibility(a.id)).toBe('');expect(responseAction(g,a)).not.toContain('disabled');
 expect(responseAction(g,a)).not.toContain('Remove intruder + patch');
 const cash=g.budget,plan=g.irPlan(a,true);expect(g.respond(a.id,true).ok).toBe(true);
 expect(g.budget).toBe(cash-g.price(plan.cost));expect(a.state).toBe('responding');
 expect(g.respond(a.id,true).ok).toBe(false);expect(responseAction(g,a)).toContain('Recovery in progress');
 g.tickJobs(1000);expect(a.state).toBe('ok');expect(a.job).toBeNull();
 a.state='compromised';a.locked=true;expect(g.responseEligibility(a.id)).toContain('Tested backups');
 g.programmes.add('backups');g.programReady.set('backups',0);g.budget=0;
 expect(g.responseEligibility(a.id)).toContain('Needs $');expect(responseAction(g,a)).toContain('available $0k');
 g.budget=1000;g.activeJobs=()=>g.concurrency();expect(responseAction(g,a)).toContain('All engineers busy');
});
it('incident reporting never reserves the infected building and prevents its cleanup',()=>{
 const g=mk();g.budget=1000;const a=[...g.assets.values()][0];a.state='compromised';g.regulator={deadline:100,filed:false};
 expect(g.fileIncident().ok).toBe(true);expect(a.job).toBeNull();expect(g.respond(a.id,true).ok).toBe(true);
});
it('engineer-led programs use a healthy fallback and can restart after interruption',()=>{
 const g=mk();g.budget=1000;g.asset(g.identityId).state='compromised';expect(g.buy('outside').ok).toBe(true);
 const job=g.jobs.find(j=>j.programme==='outside'),host=g.asset(job.assetId);expect(host.id).not.toBe(g.identityId);
 g.compromise(host,{vuln:'test'},null);g.tickJobs(0);
 expect(g.bought('outside')).toBe(false);expect(g.programEligibility('outside')).toBe('');expect(g.buy('outside').ok).toBe(true);
});
it('every program displays the same purchase eligibility used by the simulation',()=>{
 for(const id of Object.keys(PROGRAMS)){
  const g=mk();g.budget=0;const reason=g.programEligibility(id);expect(reason).not.toBe('');expect(g.buy(id)).toEqual({ok:false,reason});
 }
 expect(TRACKS[0]).toBe('Actions');
});
it('a new act cannot start a second briefing while the first engineer is still working',()=>{
 const g=mk();g.budget=1000;expect(g.buy('briefing').ok).toBe(true);g.act=1;
 expect(g.buy('briefing').ok).toBe(false);expect(g.jobs.filter(j=>j.programme==='briefing')).toHaveLength(1);
 g.tickJobs(100);expect(g.buy('briefing').ok).toBe(true);
});
it('requests are actionable in categories and only linked from the combined feed',()=>{
 const g=mk();g.budget=1000;g.regulator={deadline:100,filed:false};g.requestEvidence();g.hour=4;g.tickGrc();
 const h=g.startHumanThreat('worker-fraud');h.detectedAt=0;
 expect(renderActionDirectory(g,1,'Respond')).toContain('data-action="human-contain"');
 const left=renderActionDirectory(g,1,'Govern')+renderActionDirectory(g,1,'Respond');for(const id of ['file','freeze','grc-start','evidence-prepare'])expect(left).toContain(`data-action="${id}"`);
 expect(left).not.toContain('ALL CAPABILITIES');expect(left).toContain('program-card action-card');
 const right=renderOperations(g);for(const id of ['file','freeze','grc-start','evidence-prepare','human-contain'])expect(right).not.toContain(`data-action="${id}"`);
 for(const r of operationCards(g).filter(r=>!r.archive))expect(right).toContain(`data-action="operation-action" data-id="${r.id}"`);
 expect(right).not.toContain('ENGINEERS FREE');expect(right).not.toContain('Working');
});
it('change freezes are idempotent and never create repeated orders',()=>{
 const g=mk();expect(g.freezeChanges().ok).toBe(true);const n=g.events.length;expect(g.freezeChanges().ok).toBe(false);expect(g.events).toHaveLength(n);
});
