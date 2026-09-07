import {normalizedPoints} from './score-normalization.js';
// Outcome-based scoring. No random bonuses and no points just for purchasing items.
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const ratio=(n,d,empty=1)=>d>0?clamp(n/d):empty;
const delayQuality=(end,start,scale)=>end==null?0:1/(1+Math.max(0,end-start)/scale);
export const scoringMethods={
 initScoring(){
  this.performance={version:2,progress:0,seconds:0,servicePossible:0,serviceDelivered:0,riskSeconds:0,protectedSeconds:0,fatiguedSeconds:0,threatWeight:0,preventedWeight:0,threats:0,prevented:0,incidents:[],risks:new Map(),pending:new Set()};
  this.recordRiskInventory();
 },
 recordRiskInventory(){
  const p=this.performance;if(!p)return;
  for(const a of this.assets.values())for(const vid of a.vulns)p.risks.set(`${a.id}|${vid}`,{assetId:a.id,vid});
 },
 recordScoreInterval(dt){
  const p=this.performance;if(!p)return;this.recordRiskInventory();p.seconds+=dt;
  if(this.fatigue.active)p.fatiguedSeconds+=dt;
  for(const a of this.assets.values()){
   const weight=Math.max(1,a.revenue)*a.crit,available=a.state==='ok'&&!a.locked&&!a.quarantined;
   p.servicePossible+=weight*dt;p.serviceDelivered+=weight*dt*(available?(a.restricted?.7:1):0);
  }
  for(const r of p.risks.values()){
   const a=this.asset(r.assetId);if(!a)continue;const weight=a.crit*dt;
   p.riskSeconds+=weight;
   if(!a.vulns.has(r.vid)||a.quarantined||a.state==='isolated'||a.exposed&&a.restricted)p.protectedSeconds+=weight;
  }
 },
 scoreOpportunity(weight,prevented=false){
  const p=this.performance;if(!p||!(weight>0))return;
  p.threatWeight+=weight;p.threats++;
  if(prevented){p.preventedWeight+=weight;p.prevented++;}
 },
 scoreTrackSource(at){
  const p=this.performance;if(!p||!at||at.scoreTracked)return;
  let weight=this.asset(at.targetId)?.crit||1;
  if(at.kind==='scan'){
   const risks=(this.assetsByVuln.get(at.vuln)||[]).filter(a=>a.exposed&&(a.vulns.has(at.vuln)||p.risks.has(`${a.id}|${at.vuln}`)));
   if(!risks.length)return; // Unrelated internet noise does not farm prevention points.
   weight=Math.max(...risks.map(a=>a.crit))*(at.boss?2:1);
  }
  at.scoreTracked=true;at.scoreWeight=weight;this.scoreOpportunity(weight);p.pending.add(at);
 },
 scoreExposureClosed(at){
  const p=this.performance;
  const risks=(this.assetsByVuln.get(at.vuln)||[]).filter(a=>a.exposed&&p.risks.has(`${a.id}|${at.vuln}`));
  return risks.length>0&&risks.every(a=>!a.vulns.has(at.vuln)||a.quarantined||a.restricted||a.state==='isolated');
 },
 scoreIncident(kind,a){
  const p=this.performance;if(!p)return;
  if(p.incidents.some(i=>i.kind===kind&&i.assetId===a.id&&i.closedAt==null))return;
  p.incidents.push({kind,assetId:a.id,weight:a.crit,startedAt:this.time,detectedAt:null,containedAt:null,closedAt:null});
 },
 recordScoreState(){
  const p=this.performance;if(!p)return;this.recordRiskInventory();
  p.progress=Math.max(p.progress,clamp((this.hour+(this.phase==='wave'?Math.min(1,this.phaseTimer/30):0))/this.endHour));
  for(const at of p.pending)if(!at.alive){
   if(!at.scoreLanded&&(at.scoreStopped||at.withdrawing&&this.scoreExposureClosed(at))){p.preventedWeight+=at.scoreWeight;p.prevented++;}
   p.pending.delete(at);
  }
  for(const i of p.incidents){
   if(i.closedAt!=null)continue;const a=this.asset(i.assetId);if(!a)continue;
   if(i.humanThreatId){const t=this.humanThreats.find(t=>t.id===i.humanThreatId);if(t){i.detectedAt=t.detectedAt;i.containedAt=t.containedAt;i.closedAt=t.resolvedAt;}continue;}
   const leak=i.kind==='leak',detected=leak?a.leak?.detected:a.detectedAt!=null&&a.detectedAt>=i.startedAt;
   if(detected&&i.detectedAt==null)i.detectedAt=this.time;
   const closed=leak?!a.leak?.active:a.state==='ok'&&!a.locked;
   if((a.quarantined||a.state==='isolated'||a.state==='responding'||closed)&&i.containedAt==null)i.containedAt=this.time;
   if(closed){i.closedAt=this.time;i.detectedAt??=this.time;}
  }
 },
 scoreEvidence(){
  const p=this.performance;if(p.finalEvidence)return p.finalEvidence;
  const progress=Math.max(p.progress,clamp((this.hour+(this.phase==='wave'?Math.min(1,this.phaseTimer/30):0))/this.endHour));
  const health=clamp(1-this.impact/100),uptime=ratio(p.serviceDelivered,p.servicePossible),exposure=ratio(p.protectedSeconds,p.riskSeconds);
  const prevention=ratio(p.preventedWeight,p.threatWeight),data=1/(1+(this.stats.leakedGB||0)/20);
  const net=Math.max(0,this.stats.spent-this.stats.refunded)+(this.stats.fraudLoss||0)+(this.stats.insiderLoss||0),resources=Math.max(1,this.org.budget+this.stats.earned+this.accruedIncome+(this.flags.emergencyBudget?{startup:40,midcap:60,enterprise:100}[this.org.id]:0));
  const discipline=clamp(1-net/resources),r=this.regulator;
  const reporting=!r?'not required':r.filed?(r.filedAt<=r.deadline?'filed on time':'filed late'):this.time<=r.deadline?'pending · within deadline':'overdue';
  const regulatory=!r||(r.filed?r.filedAt<=r.deadline:this.time<=r.deadline);
  let responseSum=0,weight=0;const delays={detection:[],containment:[],recovery:[]};
  for(const i of p.incidents){
   responseSum+=i.weight*(.25*delayQuality(i.detectedAt,i.startedAt,20)+.45*delayQuality(i.containedAt,i.startedAt,40)+.30*delayQuality(i.closedAt,i.startedAt,120));weight+=i.weight;
   for(const [name,key]of [['detection','detectedAt'],['containment','containedAt'],['recovery','closedAt']])if(i[key]!=null)delays[name].push(Math.max(0,i[key]-i.startedAt));
  }
  const means=Object.fromEntries(Object.entries(delays).map(([k,v])=>[k,v.length?v.reduce((a,b)=>a+b,0)/v.length:null]));
  return{version:p.version,progress,impact:this.impact,health,uptime,exposure,prevention,data,net,resources,discipline,reporting,regulatory,response:ratio(responseSum,weight),team:1-ratio(p.fatiguedSeconds,p.seconds,0),trust:clamp(this.trust/5),threats:p.threats,prevented:p.prevented,incidents:p.incidents.length,unresolved:p.incidents.filter(i=>i.closedAt==null).length,means,leakedGB:this.stats.leakedGB||0};
 },
 scoreBreakdown(){
  const e=this.scoreEvidence(),pct=n=>`${Math.round(n*100)}%`,seconds=n=>n==null?'—':`${n.toFixed(1)}s`;
  const resilience=normalizedPoints(4000,.6*e.health+.3*e.uptime+.1*e.data,e.progress,this.org.id);
  // Retained money is only valuable alongside measured prevention and exposure reduction.
  const efficiency=normalizedPoints(3000,(.7*e.prevention+.3*e.exposure)*(.65+.35*e.discipline),e.progress,this.org.id);
  const leadership=normalizedPoints(3000,.5*e.response+.2*e.exposure+.15*(e.regulatory?1:0)+.1*e.trust+.05*e.team,e.progress,this.org.id);
  return[
   {id:'resilience',name:'Business resilience',value:resilience,max:4000,detail:`${e.impact.toFixed(1)} impact · ${pct(e.uptime)} weighted uptime · ${e.leakedGB.toFixed(1)} GB lost`},
   {id:'efficiency',name:'Defense effectiveness',value:efficiency,max:3000,detail:`${e.threats?`${e.prevented}/${e.threats} relevant attempts prevented (${pct(e.prevention)} weighted)`:'No relevant attempts yet'} · ${pct(e.exposure)} exposure controlled · $${e.net.toFixed(0)}k spend + fraud loss`},
   {id:'leadership',name:'Response & leadership',value:leadership,max:3000,detail:`${e.incidents?`Detect ${seconds(e.means.detection)} · contain ${seconds(e.means.containment)} · recover ${seconds(e.means.recovery)} · ${e.unresolved} unresolved`:'No incidents: prevention credit'} · ${Math.round(e.trust*5)}/5 trust · reporting ${e.reporting}`},
  ];
 },
};
