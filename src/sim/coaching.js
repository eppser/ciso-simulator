// Authored guidance and social engineering, separate from observed exploit telemetry.
export const coachingMethods={
 socialEngineering(){
  const target=this.asset(this.identityId);if(!target||target.state!=='ok'||target.quarantined)return false;
  this.stats.socialAttempts=(this.stats.socialAttempts||0)+1;
  const trained=this.has('training')&&this.rng.chance(.65),identity=this.has('pam')||this.rng.chance(this.has('hardware')?.95:this.has('mfa')?.8:0);
  if(trained||identity){this.scoreOpportunity(target.crit,true);this.stats.socialBlocked=(this.stats.socialBlocked||0)+1;this.log(`${trained?'Staff verified the request':'Identity controls rejected the stolen login'}: social-engineering attempt blocked.`,'good',{assetId:target.id});if(this.time-(this.flags.socialVoiceAt??-1000)>80){this.say('social_blocked');this.flags.socialVoiceAt=this.time;}return true;}
  const at={id:this.nextId++,vuln:'Social engineering / executive impersonation',hp:45,maxHp:45,speed:1.3,boss:false,kind:'lateral',credential:true,social:true,x:0,y:11,cx:0,cy:11,nx:0,ny:11,targetId:target.id,revealed:this.has('awareness'),slow:1,alive:true,web:false,age:0,lured:false,relevant:true,ip:''};
  this.attackers.push(at);this.scoreTrackSource(at);this.log('Executive impersonation bypassed the help desk. Staff training and stronger login checks reduce this risk.','warn');
  if(this.time-(this.flags.socialVoiceAt??-1000)>80){this.say('social_warning');this.flags.socialVoiceAt=this.time;}return true;
 },
 tickCoaching(){
  const candidates=[];
  for(const a of this.assets.values()){
   if(a.leak?.active){const age=this.time-a.leak.startedAt;if(!a.leak.detected&&age>25)candidates.push({id:'hint_detect',text:this.bought('dlp')?'Data loss monitoring is rolling out. Prepare an engineer and quarantine budget.':'Data is leaving. Programs → Detect → Data loss monitoring identifies the source.',programId:'dlp',track:'Detect'});
    if(a.leak.detected&&!a.quarantined&&age>35)candidates.push({id:'hint_contain',text:`Leak traced to ${a.name}. Select it and quarantine egress, then remove the collector.`,assetId:a.id});
    if(a.leak.detected&&a.quarantined&&!a.job&&age>55)candidates.push({id:'hint_cleanup',text:`${a.name} is contained but not clean. Assign an engineer to remove the collector.`,assetId:a.id});}
   if(a.supplySource&&a.state==='compromised'&&!a.job&&!a.locked&&this.time-(a.compromisedAt??0)>25)candidates.push({id:'hint_supply',text:`Poisoned update in ${a.name}. Quarantine, then remove the intruder to end its internal waves.`,assetId:a.discovered?a.id:null});
  }
  this.flags.coaching=candidates[0]||null;this.flags.coachIds=candidates.map(c=>c.id);
  if(candidates.length&&this.time>=(this.flags.nextCoachAt||0)){this.flags.nextCoachAt=this.time+65;this.say(candidates[(this.flags.coachCursor||0)%candidates.length].id);this.flags.coachCursor=(this.flags.coachCursor||0)+1;}
 },
};
