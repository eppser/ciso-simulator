import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {buildThreatModel} from '../src/sim/data.js';
import {SCENARIO} from '../src/scoreboard-config.js';
const STEP=1/30;
const day=JSON.parse(fs.readFileSync(new URL('../data/day-'+SCENARIO+'.json',import.meta.url),'utf8')),counts=new Map();
for(const r of day.vulnerabilities)counts.set(r.id,(counts.get(r.id)||0)+1);
const model=buildThreatModel({...day,vulnerabilities:day.vulnerabilities.map((r,i)=>({...r,id:counts.get(r.id)>1?`${r.id} / row ${i+1}`:r.id}))});
const results=[];
for(const org of Object.keys(ORGS))for(const policy of ['walls-only','routed-response']){
 const g=new Campaign({model,org:ORGS[org],seed:Number(SCENARIO.replaceAll('-',''))}),initial=g.budget;
 let built=0;for(let y=0;y<22;y++)if(![7,14].includes(y)&&g.place('wall',2,y).ok)built++;
 const layoutCost=g.stats.spent,oldLayoutCost=Array.from({length:built},(_,i)=>g.price(4+2*i)).reduce((a,b)=>a+b,0);
 const plan=['scanner','discovery','mfa','backups','soc1','retainer','intel','vetting','dlp','awareness','soc2','pam'];
 for(let step=0;step<120000&&!['won','lost'].includes(g.phase);step++){
  if(policy==='routed-response'&&step%150===0){
   if(g.pendingDilemma){g.describeDilemma(g.pendingDilemma);const d=g.pendingDilemma,wanted={ransom:'rebuild',crown:'file',review:'concede',vendor:'reset',fatigue:'rest'}[d.family];const c=d.choices.find(c=>c.enabled&&c.id===wanted)||d.choices.find(c=>c.enabled);if(c)g.choose(d.id,c.id);}
   for(const a of [...g.assets.values()].filter(a=>a.discovered&&!a.job).sort((a,b)=>b.crit-a.crit)){
    if(a.leak?.active&&a.leak.detected){g.quarantine(a.id);g.cleanLeak(a.id);continue;}
    if(a.state==='compromised'){if(!a.locked)g.quarantine(a.id);g.respond(a.id,true);continue;}
    const v=[...(a.knownVulns||[])].find(id=>g.vuln(id)?.patchable&&g.fixHour(id)===null);if(v)g.patch(a.id,v);else if(a.exposed&&a.knownVulns?.size&&!a.restricted)g.restrictService(a.id);
   }
   for(const t of g.humanThreats){if(t.detectedAt!=null&&t.state==='active')g.containHumanThreat(t.id);if(t.state==='contained')g.investigateHumanThreat(t.id);}
   for(const t of g.grc||[])if(t.state==='pending'&&g.grcRequirement(t.id))g.startGrc(t.id);
   if(g.regulator&&!g.regulator.filed)g.fileIncident();
   const p=plan.find(id=>!g.bought(id));if(p&&g.budget>=g.programCost(p)+20)g.buy(p);
   if(g.hour>=4&&g.budget>70)for(const [type,x,y]of [['ips',3,7],['waf',3,14],['ndr',6,10]])if(g.canPlace(type,x,y).ok){g.place(type,x,y);break;}
  }
  g.tick(STEP);g.effects.length=0;g.popups.length=0;
  assert.ok(Number.isFinite(g.budget)&&g.budget>=-.00001);assert.ok(g.attackers.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));
 }
 assert.ok(['won','lost'].includes(g.phase));assert.ok(g.score()>=0&&g.score()<=10000);assert.equal(g.scoreBreakdown().reduce((s,c)=>s+c.value,0),g.score());
 if(policy==='walls-only'){assert.equal(g.phase,'lost');assert.ok(g.stats.compromises>0||g.impact>0);}
 results.push({org,policy,built,unitPrice:g.buildCost('wall'),initialBudget:initial,oldLayoutCost,layoutCost,outcome:g.phase,hour:g.hour,score:g.score(),impact:g.impact});
}
fs.mkdirSync('artifacts/firewall-v25',{recursive:true});fs.writeFileSync('artifacts/firewall-v25/economy.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
