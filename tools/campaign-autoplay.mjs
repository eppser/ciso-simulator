// Production Campaign strategy harness; deliberately uses the same command API as the UI.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Campaign } from '../src/sim/campaign.js';
import { buildThreatModel } from '../src/sim/data.js';
import { ORGS } from '../src/sim/orgs.js';
export function runCampaign(org='startup',seed=20260902,mode='full'){
 const day=JSON.parse(fs.readFileSync(new URL('../data/day-2026-09-02.json',import.meta.url)));
 const seen=new Map();for(const r of day.vulnerabilities)seen.set(r.id,(seen.get(r.id)||0)+1);
 const model=buildThreatModel({...day,vulnerabilities:day.vulnerabilities.map((r,i)=>({...r,id:seen.get(r.id)>1?`${r.id} / row ${i+1}`:r.id}))});
 const g=new Campaign({model,org:ORGS[org],seed,mode});
 const orders=['scanner','discovery','intel','soc1','mfa','backups','retainer','vetting','dlp','awareness','pam','soc2'];
 for(let tick=0;tick<20000&&!['won','lost'].includes(g.phase);tick++){
   if(g.pendingDilemma){const d=g.pendingDilemma,preferred={crown:'file',review:'concede',vendor:'reset',fatigue:'rest',ransom:'rebuild'}[d.family];const choices=d.choices.filter(c=>c.enabled).sort((a,b)=>(b.id===preferred)-(a.id===preferred));if(!choices.some(c=>g.choose(d.id,c.id).ok))throw new Error('No exit from decision');continue;}
   if(tick%5===0){
     if(g.firstAssetId&&g.time<3){g.isolate(g.firstAssetId);g.patch(g.firstAssetId,g.firstVulnId);}
     for(const a of [...g.assets.values()].filter(a=>a.discovered&&!a.job).sort((a,b)=>b.crit-a.crit)){
       if(g.activeJobs()>=g.concurrency())break;
       if(a.leak?.detected&&a.leak.active){if(!a.quarantined)g.quarantine(a.id);g.cleanLeak(a.id);continue;}
       if(a.state==='compromised'){if(!a.quarantined&&!a.locked)g.quarantine(a.id);g.respond(a.id,true);continue;}
       const vuln=[...(a.knownVulns||[])].find(v=>g.vuln(v)?.patchable&&g.fixHour(v)===null);
       if(vuln){g.patch(a.id,vuln);continue;}
       if(a.canEdr&&!a.appliance&&!a.edr&&a.crit===3&&g.hour>=3)g.installEdr(a.id);
     }
     for(const t of g.grc||[])if(t.state==='pending'&&g.grcRequirement(t.id)&&g.activeJobs()<g.concurrency())g.startGrc(t.id);
     const next=orders.find(p=>!g.bought(p));if(next&&g.budget>g.programCost(next)+20)g.buy(next);
     if(g.hour>=6&&g.budget>100){for(const [type,x,y]of [['waf',7,6],['ips',6,11],['waf',10,14],['ndr',6,16]])if(!g.towers.some(t=>t.x===x&&t.y===y)){g.place(type,x,y);break;}}
   }
   g.tick(.1);g.effects=[];g.popups=[];
 }
 return {trust:g.trust,grc:g.grc,org,seed,mode,phase:g.phase,hour:g.hour,impact:+g.impact.toFixed(2),score:g.score(),budget:+g.budget.toFixed(1),compromises:g.stats.compromises,patched:g.stats.patched,seconds:+g.time.toFixed(1),decisions:g.dilemmaHistory.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)for(const org of Object.keys(ORGS))for(const seed of [20260902,1,7])console.log(JSON.stringify(runCampaign(org,seed)));
