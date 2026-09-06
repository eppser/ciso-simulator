// Optional in-game liaison workflow. No network transmission or legal deadline.
export const evidenceMethods = {
  requestEvidence() {
    if(this.evidence)return;
    this.evidence={state:'requested',requestedAt:this.time};
    this.log('FBI liaison requested logs. Optional: preserve a reviewed packet in Operations. Containment comes first.','warn');
  },
  evidenceReady(){return ['ready','shared','retained'].includes(this.evidence?.state);},
  deferEvidence(){
    if(!['requested','deferred'].includes(this.evidence?.state))return {ok:false,reason:'Only an unstarted request can be deferred.'};
    this.evidence.state=this.evidence.state==='requested'?'deferred':'requested';
    this.log(this.evidence.state==='deferred'?'FBI request deferred. No trust penalty; containment remains the priority.':'FBI evidence request reopened.','info');return {ok:true};
  },
  evidenceEligibility(){
    if(this.evidence?.state!=='requested')return 'No evidence packet awaiting preparation.';
    if(this.budget<this.price(5))return 'Not enough budget.';
    if(this.activeJobs()>=this.concurrency())return 'All engineers busy. Contain first or wait for capacity.';
    if(![...this.assets.values()].some(a=>a.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job))return 'Restore a healthy system for evidence collection.';
    return '';
  },
  prepareEvidence(){
    const reason=this.evidenceEligibility();if(reason)return {ok:false,reason};
    const host=[...this.assets.values()].find(a=>a.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job);
    const result=this.startJob(host,{kind:'programme',programme:'liaison-evidence',seconds:20,cost:5});
    if(result.ok){this.evidence.state='working';this.evidence.assetId=host.id;this.log('Engineer preserving and reviewing incident logs. Sharing requires a separate decision.','build');}
    return result;
  },
  finishEvidence(){
    if(this.evidence?.state!=='working')return;
    this.evidence.state='ready';this.evidence.readyAt=this.time;
    this.stats.evidencePrepared=(this.stats.evidencePrepared||0)+1;
    this.log('Reviewed logs preserved locally. Future incident reporting takes 10s instead of 20s. Share with the liaison or keep local.','good');
  },
  decideEvidence(share){
    if(!['ready','retained'].includes(this.evidence?.state))return {ok:false,reason:'Prepare the packet first; shared evidence cannot be rewarded twice.'};
    if(share){const before=this.trust;this.evidence.state='shared';this.evidence.sharedAt=this.time;this.trust=Math.min(5,this.trust+1);this.stats.evidenceShared=1;this.log(`Reviewed packet shared with the in-game FBI liaison · ${this.trust>before?'trust +1':'full trust maintained'}. Threats remain active; containment is still required.`,'good');}
    else{if(this.evidence.state==='retained')return {ok:false,reason:'Already retained locally.'};this.evidence.state='retained';this.log('Evidence kept local. No trust penalty; reporting speed benefit retained. You can share later.','info');}
    return {ok:true};
  },
  tickEvidence(){
    if(this.evidence?.state==='working'&&!this.jobs.some(j=>j.programme==='liaison-evidence')){
      this.evidence.state='requested';delete this.evidence.assetId;
      this.log('Evidence collection interrupted. Reassign an engineer; no evidence benefit was awarded.','warn');
    }
  },
};
