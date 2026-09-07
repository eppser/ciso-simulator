import {it,expect} from 'vitest';
import fs from 'node:fs';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
import {PACING,releaseTimes,countEnvelope,combatToughness} from '../src/sim/pacing.js';
import {PROGRAMS,TRACKS} from '../src/sim/campaign-rules.js';
import {ACTION_DIRECTORY,renderActionDirectory} from '../src/ui/action-directory.js';
import {operationCards} from '../src/ui/operations-center.js';
const day=BUILTIN_DAYS[0];
const mk=(org='startup',input=day)=>new Campaign({org:ORGS[org],model:scenarioModel(input),seed:42});
it('vendor offers and change-freeze work are visible from both entry points',()=>{
 const g=mk();g.vendorOffer();g.freezeChanges();const cards=operationCards(g);
 expect(cards.some(c=>c.id==='vendor-offer')).toBe(true);expect(cards.some(c=>c.id==='change-freeze')).toBe(true);
 const html=renderActionDirectory(g);expect(html.match(/data-action="vendor-buy"/g)).toHaveLength(1);expect(html).toContain('Change freeze queued');
});
it('every security mutation in the command router is in the action directory',()=>{
 const listed=new Set(ACTION_DIRECTORY.flatMap(a=>a.actions));
 const all=[...fs.readFileSync(new URL('../src/ui/command.js',import.meta.url),'utf8').matchAll(/case '([^']+)'/g)].map(m=>m[1]);
 const interfaceActions=new Set('work-toggle grc-toggle ops-view ops-expand ops-history ops-decision work-close threat-program start begin-duty vendor-regular leak-help score-help help-page trust-help coach ransom-help incident-asset resume menu restart restart-confirm menu-organizations help tab select track team inspect-close pause speed early audio labels activity camera call-close decision-toggle results copy download action-route'.split(' '));
 interfaceActions.add('leaderboard');interfaceActions.add('operation-action');
 for(const id of all)expect(listed.has(id)||interfaceActions.has(id),id).toBe(true);
 for(const id of listed)expect(all,id).toContain(id);
});
it('Programs live actions retain the exact target ids from Operations',()=>{
 const g=mk();g.hour=4;g.tickGrc();const t=g.startHumanThreat('worker-fraud');t.detectedAt=0;
 const html=renderActionDirectory(g);expect(html).toContain('data-id="inventory"');expect(html).toContain(`data-id="${t.id}"`);
 expect(html).not.toContain('data-id="program-');expect(html).toContain('id="program-incident-');
});
it('program prerequisites form a valid acyclic graph and every track is discoverable',()=>{
 expect(TRACKS).toContain('Actions');
 for(const p of Object.values(PROGRAMS)){
  expect([...TRACKS,'Team']).toContain(p.track);expect(p.cost).toBeGreaterThanOrEqual(0);expect(p.seconds).toBeGreaterThanOrEqual(0);
  const seen=new Set([p.id]);let next=p.requires;
  while(next){expect(PROGRAMS[next],next).toBeDefined();expect(seen.has(next)).toBe(false);seen.add(next);next=PROGRAMS[next].requires;}
 }
});
it.each(Object.keys(ORGS))('%s has an increasing three-act source envelope for sparse and huge input counts',org=>{
 const inputs=[day,{...day,vulnerabilities:[{id:'CUSTOM',vendor:'Unmatched',product:'Novel',connections:1,unique_ips:1}]},{...day,vulnerabilities:day.vulnerabilities.map(v=>({...v,connections:v.connections*1000,unique_ips:v.unique_ips*1000}))}];
 const counts=[];
 for(const input of inputs){const g=mk(org,input);counts.push(g.waves.map(w=>w.n));const mean=(a,b)=>g.waves.slice(a,b).reduce((n,w)=>n+w.n,0)/(b-a);expect(mean(6,16)).toBeGreaterThan(mean(0,6)*2);expect(mean(16,24)).toBeGreaterThan(mean(6,16)*1.4);expect(g.waves[0].n).toBe(1);}
 expect(counts[0]).toEqual(counts[1]);expect(counts[0]).toEqual(counts[2]);
});
it.each(Object.keys(ORGS))('%s release schedules are bounded, ordered, and late surges are burstier',org=>{
 for(const n of [1,2,3,5,20,100])for(let h=0;h<24;h++){const t=releaseTimes(n,h,org,true);expect(t).toHaveLength(n);expect(t.every((x,i)=>x>=0&&x<=1&&(!i||x>=t[i-1]))).toBe(true);}
 const gap=t=>Math.max(...t.slice(1).map((x,i)=>x-t[i]));expect(gap(releaseTimes(40,23,org,true))).toBeGreaterThan(gap(releaseTimes(40,5,org,true))*5);
 expect(countEnvelope(org,23)).toBeGreaterThan(countEnvelope(org,0));
});
it.each(Object.keys(ORGS))('%s spreads device incidents into the final act',org=>{
 const g=mk(org),hours=[];g.addUnknownDevice=function(){this.flags.rogueCount=(this.flags.rogueCount||0)+1;hours.push(this.hour);return true;};g.startLeak=()=>false;
 for(let h=0;h<24;h++){g.hour=h;g.time=h*50;g.tickIncidents(0);g.time+=25;g.tickIncidents(0);}
 expect(hours).toEqual(PACING[org].rogueHours);expect(hours.at(-1)).toBeGreaterThanOrEqual(19);expect(PACING[org].insiderHour).toBeGreaterThanOrEqual(17);
});
it('extreme per-source counts are bounded in combat without editing observations',()=>{
 expect(combatToughness({toughness:400})).toBe(140);expect(combatToughness({toughness:2})).toBe(24);
});
