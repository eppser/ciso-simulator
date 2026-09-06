const activeStates=new Set(['active','contained','investigating']);
const title=kind=>kind==='worker-fraud'?'Remote-worker fraud':'Insider threat';
const line=(kind,suffix)=>(kind==='worker-fraud'?'worker':'insider')+'_'+suffix;

// Designed people-risk scenarios: independent of the Shadowserver observations.
// Awareness is a reporting layer, not proof of identity. Revocation remains free.
export const humanThreatMethods={
 startHumanThreat(kind,asset){
  if(!['worker-fraud','insider'].includes(kind)||this.humanThreats.some(t=>t.kind===kind))return false;
  const a=asset||[...this.assets.values()].find(a=>a.personalData&&!a.exposed&&a.state==='ok')||this.asset(this.identityId);
  if(!a)return false;
  const prevented=kind==='worker-fraud'&&(this.has('hiring')||(this.has('training')&&this.rng.chance(.5)));
  const t={id:'human-'+this.nextId++,kind,assetId:a.id,state:prevented?'prevented':'active',started:this.time,detectedAt:null,containedAt:null,resolvedAt:null,budgetLost:0,impact:0,jobHostId:null};
  this.humanThreats.push(t);this.scoreOpportunity(a.crit,prevented);
  if(prevented){t.resolvedAt=this.time;this.say('worker_prevented');this.log('Suspicious remote onboarding stopped before access was issued. Verification and staff reporting prevented the attempt.','good');return t;}
  this.scoreIncident(kind,a);const evidence=this.performance.incidents.find(i=>i.kind===kind&&i.assetId===a.id&&i.closedAt==null);if(evidence)evidence.humanThreatId=t.id;
  if(kind==='worker-fraud')this.say('worker_intro');
  this.log(kind==='worker-fraud'?'Remote onboarding and payroll anomaly. Source unconfirmed; access review is underway.':'Suspicious internal access and export activity. Source unconfirmed; access review is underway.','warn');
  return t;
 },
 humanThreatStatus(){
  return this.humanThreats.filter(t=>activeStates.has(t.state)).map(t=>({...t,assetId:t.detectedAt!=null&&this.asset(t.assetId)?.discovered?t.assetId:null,investigationCost:this.price(8),investigationSeconds:Math.round(25*this.jobSpeed())}));
 },
 detectHumanThreat(id){
  const t=this.humanThreats.find(t=>t.id===id);if(!t||t.state!=='active'||t.detectedAt!=null)return false;
  const a=this.asset(t.assetId);if(!a)return false;
  t.detectedAt=this.time;this.discover(a,'access review');this.say(line(t.kind,'detected'));
  this.log(`${title(t.kind)} confirmed at ${a.name}. Revoke access now for free, then investigate credentials and preserve evidence.`,'fail',{assetId:a.id});
  this.fx('discover',a.x+1,a.y+1);this.recordScoreState();return true;
 },
 containHumanThreat(id){
  const t=this.humanThreats.find(t=>t.id===id);
  if(!t||t.state!=='active')return {ok:false,reason:'This access is already contained or no longer active.'};
  if(t.detectedAt==null)return {ok:false,reason:'The access review has not identified the account yet.'};
  t.state='contained';t.containedAt=this.time;this.say(line(t.kind,'contained'));
  this.log(`${title(t.kind)}: sessions revoked and account disabled. Recurring loss stopped; investigate to close the case.`,'good',{assetId:t.assetId});this.recordScoreState();return {ok:true};
 },
 investigateHumanThreat(id){
  const t=this.humanThreats.find(t=>t.id===id);
  if(!t||t.state!=='contained')return {ok:false,reason:'Identify and revoke the account first.'};
  const host=[...this.assets.values()].find(a=>a.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job);
  if(!host)return {ok:false,reason:'Restore one available system for evidence collection. Access remains revoked.'};
  const result=this.startJob(host,{kind:'programme',programme:'human-'+id,seconds:25,cost:8});
  if(result.ok){t.state='investigating';t.jobHostId=host.id;t.jobCost=host.job.cost;this.log(`${title(t.kind)}: engineer collecting evidence, reviewing identity and rotating credentials.`,'build',{assetId:t.assetId});}
  return result;
 },
 finishHumanThreat(id){
  const t=this.humanThreats.find(t=>t.id===id);if(!t||t.state!=='investigating')return false;
  t.state='resolved';t.resolvedAt=this.time;t.jobHostId=null;
  this.stats[t.kind==='worker-fraud'?'workerFraudResolved':'insiderResolved']=(this.stats[t.kind==='worker-fraud'?'workerFraudResolved':'insiderResolved']||0)+1;
  this.say(line(t.kind,'resolved'));this.log(`${title(t.kind)} closed: evidence secured, credentials rotated and access removed.`,'good',{assetId:t.assetId});this.recordScoreState();return true;
 },
 tickHumanThreats(dt){
  for(const [kind,hour]of [['worker-fraud',this.pacing.fraudHour],['insider',this.pacing.insiderHour]])if(this.hour>=hour)this.startHumanThreat(kind);
  for(const t of this.humanThreats){
   if(t.state==='investigating'&&!this.jobs.some(j=>j.programme==='human-'+t.id)){
    // Encryption can cancel jobs. Access stays revoked and the cancelled fee is credited.
    t.state='contained';t.jobHostId=null;this.budget+=t.jobCost||0;this.stats.refunded+=t.jobCost||0;t.jobCost=0;
    this.log(`${title(t.kind)}: evidence job interrupted; fee credited. Access remains revoked. Reassign an engineer.`,'warn');
   }
   if(t.state!=='active')continue;
   const delay=this.has('awareness')?8:this.has('training')?22:45;
   if(t.detectedAt==null&&this.time-t.started>=delay)this.detectHumanThreat(t.id);
   const a=this.asset(t.assetId);if(!a)continue;
   // Offline infrastructure also prevents use of the account, without closing the case.
   if(!a.quarantined&&!a.locked&&!['isolated','responding','down'].includes(a.state)){
    const mitigation=t.kind==='insider'&&this.has('pam')?.3:1,easy=this.org.id==='startup'?.65:1;
    const loss=Math.min(Math.max(0,this.budget),dt*(t.kind==='worker-fraud'?.12:.04)*mitigation*easy);
    const impact=dt*(t.kind==='worker-fraud'?.008:.022)*mitigation*easy;
    this.budget-=loss;t.budgetLost+=loss;t.impact+=impact;this.impact+=impact;
    const stat=t.kind==='worker-fraud'?'fraudLoss':'insiderLoss';this.stats[stat]=(this.stats[stat]||0)+loss;
    // The first visual marker must not reveal a still-unconfirmed source.
    if(t.detectedAt!=null)this.noteAssetImpact(a,impact,title(t.kind),true);
   }
   if(t.detectedAt!=null&&this.time-t.detectedAt>=25&&!t.tipSent){t.tipSent=true;this.say(t.kind==='worker-fraud'?'worker_tip':'insider_detected');this.log(`${title(t.kind)} still active. Revoke access in Active threats; it costs nothing and needs no engineer.`,'warn',{assetId:t.assetId});}
  }
 },
};
