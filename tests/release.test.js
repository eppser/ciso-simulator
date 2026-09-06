import {describe,it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {scenarioModel,BUILTIN_DAYS,daySeed} from '../src/sim/scenarios.js';
import {ORGS} from '../src/sim/orgs.js';
import {recordRun,verifyReplay,validateReplay,STEP,RULESET,SCENARIO} from '../src/sim/replay.js';
import {publicText,boardQuery,boundedJSON} from '../server/validation.js';
const mk=org=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],seed:daySeed(SCENARIO),mode:'full'});
describe('release security and simulation regressions',()=>{
 it('cannot queue an unrelated fix on an isolated asset',()=>{const g=mk('startup'),a=g.asset('idp');a.state='isolated';expect(g.patch(a.id,g.firstVulnId).ok).toBe(false);expect(a.queuedFix).toBeFalsy();});
 it('cosmetic messages do not consume entity IDs',()=>{const g=mk('startup'),id=g.nextId;g.say('hello');g.say('hello');expect(g.nextId).toBe(id);expect(g.messages.at(-1).seq).not.toBe(g.messages.at(-2).seq);});
 it('outside scan clears stale status',()=>{const g=mk('startup');g.budget=1000;const a=[...g.assets.values()].find(a=>a.exposed);a.scanStale=true;expect(g.buy('outside').ok).toBe(true);g.tickJobs(60);expect(a.scanStale).toBe(false);});
 it.each(Object.keys(ORGS))('replays a complete %s run with exactly matching scores',org=>{const g=mk(org),run=recordRun(g);g.buy('scanner');g.startHourEarly();while(!['won','lost'].includes(g.phase)){g.tick(STEP);g.effects.length=0;g.popups.length=0;}const r=verifyReplay(run);expect(r.score).toBe(g.score());expect(r.categories).toEqual(g.scoreBreakdown().map(c=>c.value));const budget=g.budget;expect(g.buy('mfa').ok).toBe(false);expect(g.budget).toBe(budget);},15000);
 it('rejects private scenarios, unordered and internal commands',()=>{const base={ruleset:RULESET,scenario:SCENARIO,org:'startup',steps:100,commands:[]};expect(()=>validateReplay({...base,org:'__proto__'})).toThrow();for(const method of ['tick','spend','constructor','__proto__','startJob','damage'])expect(()=>validateReplay({...base,commands:[{step:0,method,args:[]}]})).toThrow();expect(()=>validateReplay({...base,steps:Infinity})).toThrow();expect(()=>validateReplay({...base,commands:[{step:10,method:'buy',args:['scanner']},{step:2,method:'buy',args:['mfa']}]})).toThrow();expect(()=>verifyReplay(base)).toThrow('Finish');});
 it('validates names and prevents HTML, control characters and URL spam',()=>{expect(publicText('  Patch Whisperer  ',28,'name')).toBe('Patch Whisperer');for(const s of ['<svg onload=alert(1)>','a\u202Eb','a\nb','https://evil.test','x'.repeat(50),'a'])expect(()=>publicText(s,28,'name')).toThrow();});
 it('bounds scoreboard pagination and filter injection',()=>{expect(boardQuery(new URL('https://game.test?view=history&org=midcap&page=2')).page).toBe(2);for(const q of ['page=-1','page=Infinity','org=or(score.gt.1)','view=sql'])expect(()=>boardQuery(new URL('https://game.test?'+q))).toThrow();});
 it('enforces the streaming payload limit even without Content-Length',async()=>{await expect(boundedJSON(new Request('https://game.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({x:'x'.repeat(100)})}),30)).rejects.toThrow('large');});
});
