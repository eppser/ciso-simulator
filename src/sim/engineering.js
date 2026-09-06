export const engineeringMethods={
 tickEngineering(){
  // Reaction to existing world events, not extra scripted infection or arbitrary penalties.
  this.flags.headSeen??={};
  if(this.time<(this.flags.headNextAt||75))return;
  const assets=[...this.assets.values()];
  const cases=[
   ['head_newsystem',(this.flags.rogueCount||0)>0],
   ['head_isolate',assets.some(a=>a.discovered&&(a.restricted||a.quarantined||a.state==='isolated'))],
   ['head_patchless',this.zeroDays.some(z=>z.landed&&!z.fixed)],
   ['head_capacity',this.activeJobs()>=this.concurrency()&&this.activeJobs()>0],
   ['head_rollout',[...this.programReady.values()].some(t=>t>this.time)],
   ['head_intro',true],
  ];
  let eligible=cases.filter(([id,ready])=>ready&&!this.flags.headSeen[id]);
  // A general introduction must never displace a relevant operational warning.
  if(eligible.some(([id])=>id!=='head_intro'))eligible=eligible.filter(([id])=>id!=='head_intro');
  const next=eligible[Math.floor(Math.random()*eligible.length)];
  if(next){this.flags.headSeen[next[0]]=true;this.flags.headNextAt=this.time+55+Math.random()*35;this.say(next[0]);}
 },
};
