import { tickBanter } from './banter.js';
import { assetCells, assetDoors, key } from './grid.js';
import { PROGRAMS } from './campaign-rules.js';

// Designed incident mechanics. These events are not attributed to the daily dataset.
export const incidentMethods = {
  tickInternalWaves() {
    if(this.phase!=='wave')return;
    for(const a of this.assets.values()) {
      if(!a.supplySource||a.quarantined||a.locked||a.state!=='compromised')continue;
      if(a.internalHour!==this.hour){a.internalHour=this.hour;a.internalSpawned=0;a.internalQuota=Math.max(1,Math.ceil(this.waves[this.hour].n*.1));a.nextInternalAt=this.time;}
      if(a.internalSpawned>=a.internalQuota||this.time<a.nextInternalAt)continue;
      if(this.spawnInternalMalware(a)){a.internalSpawned++;a.nextInternalAt=this.time+24/a.internalQuota;}
    }
  },
  spawnInternalMalware(from) {
    const targets=[...this.assets.values()].filter(a=>a.id!==from.id&&!a.quarantined&&!a.locked&&['ok','down','maintenance'].includes(a.state));
    if(!targets.length)return false;
    const doors=assetDoors(from).filter(([x,y])=>this.map.blocked[key(x,y)]!==1);
    if(!doors.length)return false;
    const [x,y]=this.rng.pick(doors),target=this.rng.pick(targets),hp=30+this.hour*1.5;
    this.attackers.push({id:this.nextId++,vuln:'Supply-chain malware',hp,maxHp:hp,speed:.85,boss:false,kind:'lateral',malware:true,credential:false,x,y,cx:x,cy:y,nx:x,ny:y,targetId:target.id,revealed:this.has('awareness'),slow:1,alive:true,web:false,age:0,lured:false,relevant:true,fromId:from.id,ip:''});
    this.scoreTrackSource(this.attackers.at(-1));this.stats.internalSources=(this.stats.internalSources||0)+1;this.fx('internal-spawn',x,y);return true;
  },
  quarantine(id) {
    const a=this.asset(id);if(!a?.discovered)return {ok:false,reason:'Identify the system first.'};
    
    if(a.quarantined)return {ok:false,reason:'Already quarantined. Remove the intruder to restore service.'};
    if(a.state!=='compromised'&&!a.leak?.active)return {ok:false,reason:'Use Unplug or Disable public service for a healthy system.'};
    const cost=this.price(5);if(this.budget<cost)return {ok:false,reason:`Needs $${cost}k.`};
    this.spend(cost);a.quarantined=true;this.log(`${a.name}: emergency network quarantine. Spread and exfiltration stopped; service offline. Cleanup is still required.`,'warn',{assetId:id});return {ok:true};
  },
  restrictService(id) {
    const a=this.asset(id);if(!a?.discovered||!a.exposed)return {ok:false,reason:'Select an exposed inventoried system to change its exposure.'};
    a.restricted=!a.restricted;this.log(`${a.name}: ${a.restricted?'public service disabled; private service retains 70% revenue':'public service re-enabled; exposure returns'}.`,'warn',{assetId:id});
    for(const at of this.attackers)if(at.kind==='scan')this.retarget(at);return {ok:true};
  },
  startLeak(a) {
    if(!a||a.state!=='ok')return false;
    a.leak={active:true,detected:false,amount:0,startedAt:this.time};this.scoreIncident('leak',a);
    this.flags.leakStarted=true;this.say('leakanomaly');this.log('Unusual outbound volume. Source unconfirmed. Data loss monitoring can trace it.','warn');return true;
  },
  leakStatus() {
    const active=[...this.assets.values()].filter(a=>a.leak?.active);
    return {active:active.length>0,detected:active.filter(a=>a.leak.detected),amount:active.reduce((sum,a)=>sum+a.leak.amount,0)};
  },
  cleanLeak(id) {
    const a=this.asset(id);if(!a?.leak?.detected||!a.leak.active)return {ok:false,reason:'Trace the leak with Data loss monitoring first.'};
    return this.startJob(a,{kind:'programme',programme:'leak-clean',seconds:25,cost:15});
  },
  addUnknownDevice() {
    const template=[...this.assets.values()].find(a=>a.exposed&&a.threats.length);if(!template)return false;
    const spots=[];
    for(let x=5;x<27;x++)for(let y=1;y<19;y++)if(assetCells({x,y}).every(([cx,cy])=>this.map.isFree(cx,cy)&&!this.attackers.some(at=>at.alive&&Math.hypot(at.x-cx,at.y-cy)<1.5)))spots.push({x,y});
    if(!spots.length)return false;
    const pos=this.rng.pick(spots),id=`rogue-${this.nextId++}`,v=template.threats[0];
    const a={...template,...pos,id,name:'Unapproved '+(this.flags.rogueCount%2?'cloud gateway':'team server'),product:template.product,crit:1,revenue:1,shadow:true,dynamic:true,discovered:false,exposed:true,trusted:false,personalData:false,integrity:100,state:'ok',edr:false,job:null,locked:false,quarantined:false,restricted:false,supplySource:false,leak:null,knownVulns:null,scannedAt:null,scanStale:false,queuedFix:null,detectedAt:null,compromisedAt:null,compromisedBy:null,compromisedFor:0,isolatedFor:0,lateralTimer:20,vulns:new Set([v.id]),latent:new Map(),credTo:[this.identityId],patchedVulns:new Set()};
    this.assets.set(id,a);this.asset(this.identityId)?.credTo.push(id);this.totalRevenue+=a.revenue;for(const [x,y]of assetCells(a))this.map.block(x,y,1);
    for(const threat of a.threats){if(!this.assetsByVuln.has(threat.id))this.assetsByVuln.set(threat.id,[]);this.assetsByVuln.get(threat.id).push(a);}
    this.flags.rogueCount=(this.flags.rogueCount||0)+1;this.say('shadowit');this.log('A department connected an unapproved device. It is absent from the map until discovered.','warn');return true;
  },
  vendorOffer() {
    const id=['backups','awareness','dlp','retainer','soc1'].find(id=>!this.bought(id));
    if(!id)return;this.flags.offer={program:id,expires:this.time+100};this.say('salespitch_v10');
  },
  offerDetails() {
    const offer=this.flags.offer;if(!offer||offer.expires<=this.time||this.bought(offer.program))return null;
    const regular=this.programCost(offer.program);return {...offer,name:PROGRAMS[offer.program].name,regular,price:regular*1.5};
  },
  buyVendor() {
    const offer=this.offerDetails();if(!offer)return {ok:false,reason:'Offer expired or the program is already funded.'};
    if(this.budget<offer.price)return {ok:false,reason:`Needs ${offer.price}k.`};
    const result=this.buy(offer.program);if(!result.ok)return result;
    const premium=offer.price-offer.regular;this.spend(premium);this.stats[PROGRAMS[offer.program].track==='Team'?'spendPeople':'spendTools']+=premium;this.flags.offer=null;this.say('salesclosed_v10');this.log(`Emergency order accepted: ${offer.name}, ${offer.price}k.`,'info');return {ok:true};
  },
  tickIncidents(dt) {
    tickBanter(this);
    const infected=[...this.assets.values()].filter(a=>a.state==='compromised'||a.locked);
    const major=infected.some(a=>a.crit===3)||infected.length>=Math.max(2,Math.ceil(this.assets.size*.15));
    if(major&&!this.flags.incidentSalesLatched&&this.time>=(this.flags.nextSalesAt||0)){
      this.flags.salesDueAt??=this.time+9;
      if(this.time>=this.flags.salesDueAt){this.flags.incidentSalesLatched=true;this.flags.salesDueAt=null;this.flags.nextSalesAt=this.time+240;this.vendorOffer();}
    }
    if(!major){this.flags.incidentSalesLatched=false;this.flags.salesDueAt=null;this.flags.offer=null;}
    if(major&&!this.flags.agencyCalled){this.flags.agencyCalled=true;this.requestEvidence();this.say('agency_intro');}
    if(this.flags.leakStarted&&!this.flags.agencyLeak){this.flags.agencyLeak=true;this.requestEvidence();this.say('agency_leak');}
    if(this.flags.negotiating&&!this.flags.agencyRansom){this.flags.agencyRansom=true;this.requestEvidence();this.say('agency_ransom');}
    const rogueIndex=this.flags.rogueCount||0,rogueHour=this.pacing.rogueHours[rogueIndex];
    if(rogueHour!=null&&this.hour>=rogueHour){this.flags.nextRogueAt??=this.time+this.rng.int(8,20);if(this.time>=this.flags.nextRogueAt){if(this.addUnknownDevice())this.flags.nextRogueAt=null;else this.flags.nextRogueAt=this.time+20;}}
    if(this.has('discovery')){this.flags.discoveryAt??=this.time+8;if(this.time>=this.flags.discoveryAt){for(const a of this.assets.values())if(!a.discovered)this.discover(a,'continuous asset discovery');this.flags.discoveryAt=this.time+8;}}
    if(this.hour>=this.pacing.leakHour&&!this.flags.leakStarted){const a=[...this.assets.values()].find(a=>a.personalData&&!a.exposed&&a.state==='ok');if(a)this.startLeak(a);}
    for(const a of this.assets.values())if(a.leak?.active){
      if(this.has('dlp')&&!a.leak.detected){a.leak.detected=true;this.discover(a,'data loss monitoring');this.say('leakfound');this.log(`Data loss monitoring traced exfiltration to ${a.name}. Quarantine egress, then remove the collector.`,'fail',{assetId:a.id});}
      if(!a.quarantined&&!a.locked&&a.state!=='isolated'&&a.state!=='responding'){a.leak.amount+=dt*.35;this.stats.leakedGB=(this.stats.leakedGB||0)+dt*.35;this.impact+=dt*(this.org.id==='startup'?.012:.025);}
      if(a.leak.amount>=20&&!a.leak.escalated){a.leak.escalated=true;this.trust=Math.max(0,this.trust-1);this.say('leakboard');}
    }
    if(this.org.id==='startup'&&this.time>=(this.flags.tipAt||90)){
      this.flags.tipAt=this.time+100;
      const tip=this.ransomwareStatus().locked.length?'tipbackup':this.activeJobs()>=this.concurrency()?'tipcapacity':!this.has('mfa')?'tipidentity':'tipcontrols';this.say(tip);
    }
  },
};
