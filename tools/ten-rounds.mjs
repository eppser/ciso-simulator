import fs from 'node:fs';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {buildThreatModel} from '../src/sim/data.js';
const day=JSON.parse(fs.readFileSync(new URL('../data/day-2026-09-02.json',import.meta.url)));const seen=new Map();for(const r of day.vulnerabilities)seen.set(r.id,(seen.get(r.id)||0)+1);
const model=buildThreatModel({...day,vulnerabilities:day.vulnerabilities.map((r,i)=>({...r,id:seen.get(r.id)>1?`${r.id} / row ${i+1}`:r.id}))});
const configs=[
 {seed:1,style:'first-look',reaction:14},{seed:7,style:'first-look',reaction:10},
 {seed:11,style:'learning',reaction:12},{seed:42,style:'learning',reaction:10},
 {seed:20260902,style:'practiced',reaction:8},{seed:4,style:'practiced',reaction:9},
 {seed:17,style:'practiced',reaction:7},{seed:23,style:'practiced',reaction:10},
 {seed:8,style:'practiced',reaction:8},{seed:99,style:'practiced',reaction:9},
];
const results=[];
for(const [round,c]of configs.entries()){
 const g=new Campaign({model,org:ORGS.startup,seed:c.seed});let nextAction=3,actions=0,staffBusySeconds=0,capacitySeconds=0,saturatedSeconds=0,peakJobs=0;
 const attempt=fn=>{const r=fn();if(r?.ok){actions++;return true;}return false;};
 const practiced=c.style==='practiced',learning=c.style==='learning';
 const plan=practiced?['scanner','discovery','mfa','backups','retainer','intel','vetting','soc1','training','awareness','dlp','pam']:learning?['scanner','discovery','mfa','backups','retainer','training','intel','soc1']:['scanner','mfa','training','backups'];
 function act(){
  if(g.pendingDilemma){g.describeDilemma(g.pendingDilemma);const d=g.pendingDilemma,want={ransom:'rebuild',crown:'file',review:'concede',fatigue:'rest',vendor:'reset'}[d.family];const pick=d.choices.find(x=>x.id===want&&x.enabled)||d.choices.find(x=>x.enabled);if(attempt(()=>g.choose(d.id,pick.id)))return;}
  if((practiced||learning)&&g.time<15&&g.asset(g.firstAssetId).exposed&&!g.asset(g.firstAssetId).restricted){if(attempt(()=>g.restrictService(g.firstAssetId)))return;}
  const assets=[...g.assets.values()].filter(a=>a.discovered).sort((a,b)=>b.crit-a.crit||b.revenue-a.revenue);
  if(practiced){for(const a of assets){if(a.leak?.detected&&a.leak.active){if(!a.quarantined&&attempt(()=>g.quarantine(a.id)))return;if(!a.job&&attempt(()=>g.cleanLeak(a.id)))return;}if(a.state==='compromised'&&!a.quarantined&&!a.locked&&attempt(()=>g.quarantine(a.id)))return;}}
  if(practiced||learning){for(const a of assets){if(a.job)continue;if(a.state==='compromised'&&attempt(()=>g.respond(a.id,true)))return;const vid=[...(a.knownVulns||[])].find(v=>g.vuln(v)?.patchable&&g.fixHour(v)===null);if(vid&&attempt(()=>g.patch(a.id,vid)))return;if(a.restricted&&!a.vulns.size&&attempt(()=>g.restrictService(a.id)))return;}}
  const next=plan.find(id=>!g.bought(id));if(next&&g.budget>=g.programCost(next)+(practiced?25:10)&&attempt(()=>g.buy(next)))return;
  if(practiced&&g.hour>=4)for(const a of assets.filter(a=>a.crit===3&&a.canEdr&&!a.appliance&&!a.edr)){if(g.budget>50&&attempt(()=>g.installEdr(a.id)))return;}
  const placements=c.style==='first-look'?[['ips',3,4],['wall',3,10],['ips',3,18],['waf',8,5]]:[['waf',4,3],['ips',4,11],['ndr',3,15],['waf',8,15],['ips',7,18]];
  if(g.budget>65)for(const [type,x,y]of placements)if(g.map.isFree(x,y)&&attempt(()=>g.place(type,x,y)))return;
  if(practiced&&g.budget>100)for(const t of g.towers.filter(t=>t.type==='ips'||t.type==='waf'))if(t.level<2&&attempt(()=>g.upgrade(t.id)))return;
 }
 for(let step=0;step<13000&&!['won','lost'].includes(g.phase);step++){if(g.time>=nextAction){act();nextAction=g.time+c.reaction;}staffBusySeconds+=g.activeJobs()*.1;capacitySeconds+=g.concurrency()*.1;saturatedSeconds+=(g.activeJobs()>=g.concurrency()?.1:0);peakJobs=Math.max(peakJobs,g.activeJobs());g.tick(.1);g.effects=[];g.popups=[];}
 const result={staff:{capacity:g.concurrency(),peakJobs,utilization:+(staffBusySeconds/capacitySeconds).toFixed(3),saturatedSeconds:+saturatedSeconds.toFixed(1)},round:round+1,...c,modifier:g.modifier.id,phase:g.phase,hour:g.hour,seconds:+g.time.toFixed(1),impact:+g.impact.toFixed(1),score:g.score(),scores:g.scoreBreakdown(),evidence:g.scoreEvidence(),budget:+g.budget.toFixed(1),actions,compromises:g.stats.compromises,supplyIntroduced:g.stats.supplyEvents,supplyBlocked:g.stats.supplyBlocked,internalSources:g.stats.internalSources||0,socialAttempts:g.stats.socialAttempts||0,socialBlocked:g.stats.socialBlocked||0,leakedGB:+(g.stats.leakedGB||0).toFixed(1)};results.push(result);console.log(JSON.stringify({round:result.round,seed:result.seed,style:result.style,phase:result.phase,score:result.score,categories:result.scores.map(s=>s.value),unresolved:result.evidence.unresolved}));
}
const report={at:new Date().toISOString(),method:'10 seeded full-day production simulations; unmodified budgets/health; one successful player action per 7–14 simulated seconds; first-look, learning and practiced rule-based policies, not human usability evidence.',results,practicedWins:results.filter(r=>r.style==='practiced'&&r.phase==='won').length,practicedRuns:results.filter(r=>r.style==='practiced').length};
const out=process.env.TEN_ROUNDS_OUT||'artifacts/v6';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/ten-rounds.json',JSON.stringify(report,null,2));
