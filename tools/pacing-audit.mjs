import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {buildThreatModel} from '../src/sim/data.js';
import {simulate} from './super-audit.mjs';
import {PACING} from '../src/sim/pacing.js';
import {ACTION_DIRECTORY} from '../src/ui/action-directory.js';
const base=JSON.parse(fs.readFileSync('data/day-2026-09-02.json','utf8')),out='artifacts/actions-pacing-v20';fs.mkdirSync(out,{recursive:true});
const scenarioModel=day=>{const counts=new Map();for(const v of day.vulnerabilities)counts.set(v.id,(counts.get(v.id)||0)+1);return buildThreatModel({...day,vulnerabilities:day.vulnerabilities.map((v,i)=>({...v,id:counts.get(v.id)>1?`${v.id} / row ${i+1}`:v.id}))});};
const inputs={observed:base,sparse:{...base,vulnerabilities:[{id:'CUSTOM-ONE',connections:1,unique_ips:1,vendor:'Unmatched',product:'New'}]},small:{...base,vulnerabilities:base.vulnerabilities.slice(0,12)},highVolume:{...base,vulnerabilities:base.vulnerabilities.map(v=>({...v,connections:v.connections*1000,unique_ips:v.unique_ips*1000}))},manyRows:{...base,vulnerabilities:Array.from({length:2400},(_,i)=>({...base.vulnerabilities[i%base.vulnerabilities.length],id:'TEST-'+i}))},extreme:{...base,vulnerabilities:[{...base.vulnerabilities[0],connections:1000000000,unique_ips:1}]}};
const results=[];
for(const[variant,input]of Object.entries(inputs))for(const org of Object.keys(ORGS))for(let seed=120;seed<126;seed++){
 const g=new Campaign({org:ORGS[org],model:scenarioModel(input),seed});const acts=[[0,6],[6,16],[16,24]].map(([a,b])=>{const w=g.waves.slice(a,b);return{meanSources:w.reduce((n,w)=>n+w.n,0)/w.length,meanHp:w.flatMap(w=>w.attackers).reduce((n,a)=>n+a.hp,0)/w.reduce((n,w)=>n+w.n,0)};});
 assert.ok(acts[1].meanSources>acts[0].meanSources*2);assert.ok(acts[2].meanSources>acts[1].meanSources*1.4);assert.equal(g.waves[0].n,1);
 for(const w of g.waves)assert.ok(w.attackers.every((a,i)=>Number.isFinite(a.hp)&&a.hp>0&&a.t>=0&&a.t<=1&&(!i||a.t>=w.attackers[i-1].t)));
 results.push({variant,org,seed,acts,opening:g.waves[0].n,final:g.waves[23].n});
}
const playthroughs=[];
for(const[variant,input]of Object.entries(inputs)){
 const file=`${out}/fixture-${variant}.json`;fs.writeFileSync(file,JSON.stringify(input));
 for(const org of Object.keys(ORGS)){const r=simulate({file,org,seed:120,policy:'competent'});assert.deepEqual(r.warnings,[]);playthroughs.push({variant,org,phase:r.phase,hour:r.hour,score:r.score,checks:r.checks});}
}
const report={method:'108 production wave plans plus 18 complete policy playthroughs: six input variants × three levels; plans cover all six modifiers. Counts/rows are synthetic stress fixtures except observed. The 54-run bundled-day regression is separate.',runs:results.length,profiles:PACING,actionRoutes:ACTION_DIRECTORY,results,playthroughs};
fs.writeFileSync(out+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({runs:results.length,baseline:results.filter(r=>r.variant==='observed'&&r.seed===120)},null,2));
