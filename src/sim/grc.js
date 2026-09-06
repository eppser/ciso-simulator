export const GRC_TASKS=[
 {id:'inventory',name:'Asset register',hour:4,seconds:20,cost:5,requirement:'Scanner active and at least half of discovered systems scanned.'},
 {id:'recovery',name:'Recovery evidence',hour:12,seconds:30,cost:8,requirement:'Tested backups active.'},
 {id:'attestation',name:'Board risk attestation',hour:18,seconds:20,cost:5,requirement:'Asset register and recovery evidence signed off.'},
];
export const grcMethods={
 grcRequirement(id){
  if(id==='inventory'){const list=[...this.assets.values()].filter(a=>a.discovered);return this.has('scanner')&&list.filter(a=>a.knownVulns!==null).length>=Math.ceil(list.length/2);}
  if(id==='recovery')return this.has('backups');
  return ['inventory','recovery'].every(id=>this.grc?.find(t=>t.id===id)?.state==='done');
 },
 startGrc(id){
  const t=this.grc?.find(t=>t.id===id),def=GRC_TASKS.find(t=>t.id===id);
  if(!t||t.state!=='pending')return {ok:false,reason:'This evidence request is not awaiting work.'};
  if(!this.grcRequirement(id))return {ok:false,reason:def.requirement};
  const host=[...this.assets.values()].find(a=>a.discovered&&a.state==='ok'&&!a.quarantined&&!a.job);
  if(!host)return {ok:false,reason:'A healthy available system is needed to assemble evidence.'};
  const r=this.startJob(host,{kind:'programme',programme:'grc-'+id,seconds:def.seconds,cost:def.cost});
  if(r.ok){t.state='working';t.assetId=host.id;this.log(`${def.name}: engineer assigned to prepare evidence.`,'build');}
  return r;
 },
 finishGrc(id){const t=this.grc?.find(t=>t.id===id);if(t?.state==='working'){t.state='board-review';t.reviewUntil=this.time+20;this.say('grc_board');this.log(`${t.name}: evidence ready. Board sign-off in 20s.`,'info');}},
 tickGrc(){
  this.grc??=[];
  for(const def of GRC_TASKS)if(this.hour>=def.hour&&!this.grc.some(t=>t.id===def.id)){
   this.grc.push({...def,state:'pending',deadline:this.time+({startup:240,midcap:200,enterprise:160}[this.org.id]),missed:false});this.say('grc_'+def.id);this.log(`Regulator requests ${def.name}. Open Operations → Tasks.`,'warn');
  }
  for(const t of this.grc){
   if(t.state==='done')continue;
   if(t.state==='working'&&!this.jobs.some(j=>j.programme==='grc-'+t.id)){t.state='pending';this.log(`${t.name}: evidence collection interrupted. Reassign an engineer.`,'warn');}
   if(t.state==='board-review'&&this.time>=t.reviewUntil){const trustBefore=this.trust;t.state='done';t.completedAt=this.time;if(!t.missed){this.trust=Math.min(5,this.trust+1);this.stats.grcCompleted=(this.stats.grcCompleted||0)+1;}this.say('grc_done');this.log(`${t.name}: board signed; regulator accepted${t.missed?' late evidence':` on time · ${this.trust>trustBefore?'trust +1':'full trust maintained'}`}.`,'good');continue;}
   if(!t.missed&&this.time>t.deadline){t.missed=true;this.trust=Math.max(0,this.trust-1);this.stats.grcMissed=(this.stats.grcMissed||0)+1;this.say('grc_late');this.log(`${t.name}: evidence deadline missed · trust −1. Late submission still required.`,'fail');}
  }
 },
 noteAssetImpact(a,amount,reason='Business impact',continuous=false){
  if(!Number.isFinite(amount)||amount<=0)return;
  a.pendingVisualImpact=(a.pendingVisualImpact||0)+amount;
  if(continuous&&this.time<(a.nextImpactLabel||0))return;
  if(a.pendingVisualImpact<.05)return;
  this.fx('business-impact',a.x+.5,a.y+.5,{assetId:a.id,amount:a.pendingVisualImpact,reason});
  a.pendingVisualImpact=0;a.nextImpactLabel=this.time+5;
 },
};
