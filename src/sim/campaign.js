import { PACING, countEnvelope, combatToughness, releaseTimes, pressureStage } from './pacing.js';
import { evidenceMethods } from './evidence.js';
import { Game as BaseGame } from './game.js';
import { TOWERS, ACTIONS, ECONOMY, IMPACT } from './catalog.js';
import { assetDoors, key, inBounds, NO_BUILD_X } from './grid.js';
import { advanceNetworkSources, breachField } from './movement.js';
import { CALENDAR, MODIFIERS, PROGRAMS, HOUR_SECONDS, scaled } from './campaign-rules.js';
import { makeRng } from './rng.js';
import { coachingMethods } from './coaching.js';
import { incidentMethods } from './incidents.js';
import { grcMethods } from './grc.js';
import { engineeringMethods } from './engineering.js';
import { humanThreatMethods } from './human-threats.js';
import { SECURITY_OPERATIONS_CELLS } from './footprints.js';
import { scoringMethods } from './scoring.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fail = reason => ({ ok: false, reason });
const ok = () => ({ ok: true });
export class Campaign extends BaseGame {
  constructor(options) {
    const org = { ...options.org, income: { startup: 20, midcap: 40, enterprise: 60 }[options.org.id], assets: options.org.assets.map(a => ({ ...a })) };
    if (org.id === 'startup') org.assets.push({ id: 'idp', name: 'Workspace identity', product: 'Identity provider', kind: 'ad', x: 20, y: 14, crit: 3, revenue: 2, exposed: false, canEdr: true, match: [] });
    super({ ...options, org });
    for(const [x,y] of SECURITY_OPERATIONS_CELLS)if(inBounds(x,y))this.map.block(x,y,1);
    this.pacing = PACING[org.id];
    this.mode = options.mode || 'full';
    this.endHour = this.mode === 'shift' ? 6 : 24;
    this.trust = 5; this.noise = 0; this.fatigue = { busyHours: 0, active: false };
    if(org.id==='startup'){this.budget+=40;this.org.budget+=40;}
    this.busySeconds = 0; this.earlyCalls = 0; this.act = 0; this.regulator = null;
    this.pendingDilemma = null; this.dilemmaQueue = []; this.lastDilemmaAt = -1000;
    this.dilemmaHistory = []; this.advisor = []; this.messages = []; this.strip = Array(24).fill('·');
    this.programReady = new Map(); this.flags = {}; this.briefed = new Set(); this.rewarded = new Set();
    this.incomeMultiplier = 1; this.accruedIncome = 0; this.lastSale = -1000;
    this.ransomware = []; this.humanThreats = []; this.cleanEstate = false; this.refunds = []; this.firstDetection = null;
    this.stats.turnedAway = 0; this.stats.spendTools = 0; this.stats.spendPeople = 0; this.stats.refunded = 0;
    this.modifier = MODIFIERS[Math.abs(this.seed) % MODIFIERS.length];
    this.initialImpact = 0; this.nextBusyWarning = 8; this.lastHourImpact = 0;
    const all = [...this.assets.values()];
    const identity = org.id === 'startup' ? 'idp' : 'ad';
    this.identityId = identity;
    for (const a of all) {
      a.latent.clear();
      a.trusted ||= ['wsus', 'remote', 'vc', 'gp', 'ci'].includes(a.id);
      a.personalData = a.crit === 3 || ['mail', 'portal', 'files', 'web'].includes(a.id);
      a.credTo = a.id === identity || a.id === 'vc' ? all.filter(b => b.id !== a.id).map(b => b.id) : [all.filter(b => b.x > a.x).sort((b, c) => Math.hypot(a.x-b.x,a.y-b.y) - Math.hypot(a.x-c.x,a.y-c.y))[0]?.id || identity];
    }
    this.fixAt.clear();
    const first = all.find(a => a.discovered && a.exposed && a.threats.some(v => v.patchable));
    if (first) {
      const v = first.threats.find(v => v.patchable);
      // A real exposure is not player knowledge until a scanner inspects it.
      first.vulns.add(v.id);
      this.fixAt.set(v.id, org.id==='startup'?2:3); this.firstAssetId = first.id; this.firstVulnId = v.id;
    }
    this.zeroDays = all.filter(a => a.exposed && a.threats.some(v => v.patchable)).slice(1, 3).map((a, i) => ({ assetId: a.id, vulnId: a.threats.find(v => v.patchable).id, hour: i ? 15 : 9, landed: false, fixed: false }));
    this.supplyChain = [10, 19].map((hour, i) => ({ hour, assetId: all.filter(a => a.trusted)[i % Math.max(1, all.filter(a => a.trusted).length)]?.id || all.find(a => !a.exposed)?.id, fired: false, ringUntil: null }));
    this.waves = this.planDay();
    // Previous shift left a sensor. It is equipment, not cash that can be farmed.
    const tower = { id: this.nextId++, type: 'ndr', x: 4, y: 5, level: 0, cooldown: 0, target: null, fired: 0, blocked: 0, revealed: 0, mode: 'danger', placedAt: 0, paid: 0, starter: true };
    if (!this.map.isFree(4, 5)) { tower.x = 6; tower.y = 6; }
    if (this.map.isFree(tower.x, tower.y)) { this.towers.push(tower); this.map.block(tower.x, tower.y, 2); }
    this.phaseTimer=org.id==='startup'?45:30;
    this.initScoring();
    this.say('promotion');
    this.advice('Your first priority: inventory the estate. Then cover the three uplinks.');
  }
  planDay() {
    const rng = makeRng(this.seed ^ 9321), relevant = this.model.vulns.filter(v => this.assetsByVuln.has(v.id));
    const top = (relevant.length ? relevant : this.model.vulns).slice().sort((a,b) => b.perIp-a.perIp);
    return CALENDAR.map(([count, tough], h) => {
      const campaign = [8,9,10,14,15,16,20,21,22].includes(h), surge = [5,11,17,23].includes(h);
      const featured = (relevant.length ? relevant : top)[Math.floor(h/3) % (relevant.length || top.length)];
      let n = Math.max(2, Math.round(this.org.waveBase * count * this.difficulty * (surge ? h < 16 ? 1.4 : 1.5 : 1)));
      n=Math.max(1,Math.round(n*countEnvelope(this.org.id,h)));
      if(h<6)n=Math.max(2,Math.round(n*.7)); // First shift teaches decisions before saturation.
      if (h === 0) n = 1;
      if(this.org.id==='startup')n=Math.max(1,Math.round(n*(h<6?.5:.72)));
      if (this.modifier.id === 'quiet') n = Math.max(1, Math.round(n*(h < 6 ? .7 : h >= 16 ? 1.15 : 1)));
      if (this.modifier.id === 'botnet') n = Math.round(n*1.25);
      const attackers = [];
      for (let i = 0; i < n; i++) {
        let pool = rng.chance(.62) && relevant.length ? relevant : this.model.vulns;
        if (this.modifier.id === 'web' && rng.chance(.6)) pool = pool.filter(v=>v.web);
        if (this.modifier.id === 'appliance' && rng.chance(.6)) pool = pool.filter(v=>!v.web);
        if (!pool.length) pool = this.model.vulns;
        const v = rng.weighted(pool.map(v=>({ v, w: v.ips }))).v;
        const aiThreat=[8,20].includes(h)&&i===0;
      const boss = ([11,17,23].includes(h) && i===0)||aiThreat;
        const picked = boss ? top[0] : v;
        attackers.push({ vuln:picked.id, hp:Math.round(combatToughness(picked)*tough*(h<6?this.pacing.earlyHp:1)*(boss?2:1)*(this.modifier.id==='botnet'?.7:1)*(this.org.id==='startup'?.75:1)), speed:picked.speed*(boss?.65:.78)*(this.modifier.id==='botnet'?1.3:1)*(this.org.id==='startup'?.8:1), spawn:i%3, row:rng.int(0,2), boss, aiThreat, avatar:boss?'boss':i%3===1?'virus':null, ip:'', t:0 });
      }
      if (campaign && featured) for (let i=0; i<Math.ceil(n*.3)*(this.modifier.id==='campaign'?2:1); i++) attackers.push({ vuln:featured.id, hp:Math.round(combatToughness(featured)*tough*1.3), speed:featured.speed*.8, spawn:i%3, row:i%3, boss:false, ip:'', t:0 });
      if (h>=21) attackers.push(...attackers.filter(a=>a.boss).map(a=>({...a})));
      const times=releaseTimes(attackers.length,h,this.org.id,surge);
      attackers.forEach((a,i)=>a.t=times[i]);
      return { hour:h, n:attackers.length, featured:featured.id, campaign, surge, attackers };
    });
  }
  get paused() { return false; }
  advice(text) { this.advisor.push({ text, t:this.time }); if(this.advisor.length>30)this.advisor.shift(); }
  say(id) { this.messageSeq=(this.messageSeq||0)+1;this.messages.push({ id, t:this.time, seq:this.messageSeq }); if(this.messages.length>80)this.messages.shift(); }
  has(id) { return this.programmes.has(id) && (this.programReady?.get(id) ?? 0)<=this.time; }
  price(n) { return scaled(n,this.org); }
  buildCost(type) { return this.price(TOWERS[type].cost); }
  programCost(id) { return this.price(id==='insurance' && this.has('mfa') && this.has('backups') && [...this.assets.values()].filter(a=>a.crit===3&&!a.exposed).every(a=>a.edr||a.appliance&&!a.vulns.size) ? 40 : PROGRAMS[id].cost); }
  concurrency() { return Math.max(0,(this.org.id==='midcap'?1:2)+(this.has('soc1')?1:0)+(this.has('soc2')?1:0)-(this.flags?.restUntil>this.time?1:0)); }
  jobSpeed() { return (1-(this.has('soc1')?.15:0)-(this.has('soc2')?.15:0))*(this.fatigue?.active?1.2:1)*(this.flags?.freshUntil>this.time?.9:1); }
  hourlyIncome() {
    let operating=0;
    const identity=this.asset(this.identityId), trustedOff=[...this.assets.values()].filter(a=>a.trusted&&a.state!=='ok');
    for(const a of this.assets.values()) if(a.state==='ok'&&!a.quarantined) operating+=a.revenue*(a.restricted?.7:1)*(trustedOff.some(t=>t.credTo?.includes(a.id))?0:1);
    return this.org.income*(operating/this.totalRevenue)*(this.incomeMultiplier??1)*(identity&&identity.state!=='ok'?.5:1)*(this.trust<2?.85:1)*(this.cleanEstate?1.1:1)*(this.flags?.passwordResetHour===this.hour?.8:1);
  }
  trafficCost() { return 0; }
  startJob(a,job) {
    
    job.cost=this.price(job.cost);
    if(this.flags?.vendorCut && (job.kind==='patch' && a.id===this.vendorAsset))return fail('Vendor support was cut for the day.');
    if(this.flags?.vendorCut&&job.kind==='replace')job.seconds*=2;
    if(job.emergency&&this.flags?.freezeUntil>this.time)job.seconds*=1.4;
    const result=super.startJob(a,job);
    if(result.ok) { job.startedAt=this.time; this.stats.spendPeople+=job.cost; if(job.kind==='patch')this.say('patch'); if(job.kind==='ir')this.say('restore'); }
    return result;
  }
  programHost(){
    const healthy=a=>a?.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job;
    const identity=this.asset(this.identityId);
    return healthy(identity)?identity:[...this.assets.values()].find(healthy);
  }
  programEligibility(id){
    const p=PROGRAMS[id];if(!p)return 'Unknown programme.';
    if(this.jobs.some(j=>j.programme===id))return 'This program already has an engineer assigned.';
    if(this.bought(id)&&id!=='briefing')return 'Already funded.';
    if(id==='briefing'&&this.briefed.has(this.act))return 'You have briefed the board this act.';
    if(p.requires&&!this.has(p.requires))return `Needs ${PROGRAMS[p.requires].name} active first.`;
    if(this.budget<this.programCost(id))return `Needs $${this.programCost(id)}k.`;
    if(['outside','drill','briefing'].includes(id)){
      if(this.activeJobs()>=this.concurrency())return 'All engineers busy. Wait or fund another shift.';
      if(!this.programHost())return 'Restore a healthy system to run this program.';
    }
    return '';
  }
  buy(id) {
    const p=PROGRAMS[id]; if(!p)return fail('Unknown programme.');
    const reason=this.programEligibility(id);if(reason)return fail(reason);
    if(['outside','drill','briefing'].includes(id)) {
      const host=this.programHost();
      const result=this.startJob(host,{ kind:'programme', programme:id, seconds:p.seconds, cost:p.cost,act:this.act });
      if(!result.ok)return result;
      if(id==='briefing')this.briefed.add(this.act);
    } else {
      const cost=this.programCost(id);this.spend(cost);this.stats[p.track==='Team'?'spendPeople':'spendTools']+=cost;
      this.programReady.set(id,this.time+p.seconds);
    }
    this.programmes.add(id);
    if(p.seconds)this.activeFrom.set(id,this.hour+Math.ceil(p.seconds/40));
    if(['outside','drill','briefing'].includes(id))this.programReady.set(id,Infinity);
    if(id==='discovery')for(const a of this.assets.values())this.discover(a,'asset discovery');
    this.log(`${p.name} funded${p.seconds?`; ready in ${p.seconds}s`:''}.`,'build');
    this.checkObjectives();return ok();
  }
  canPlace(type,x,y) {
    
    if(type==='honeytoken'&&this.towers.filter(t=>t.type===type).length>=4)return fail('Four decoys is the maximum.');
    if(!TOWERS[type])return fail('Unknown control.');
    const cost=this.buildCost(type); if(this.budget<cost)return fail(`Needs $${cost}k.`);
    if(!Number.isInteger(x)||!Number.isInteger(y)||!inBounds(x,y)||x<1)return fail('Build on the campus grid, including its edges. Only the uplink column (x=0) is reserved.');
    if(!this.map.isFree(x,y))return fail('That tile is occupied.');
    if(this.attackers.some(a=>a.alive&&((a.cx===x&&a.cy===y)||(a.nx===x&&a.ny===y)||Math.hypot(a.x-x,a.y-y)<.7)))return fail('An attacker is crossing this tile.');
    return ok();
  }
  place(type,x,y) {
    const check=this.canPlace(type,x,y);if(!check.ok)return check;
    const cost=this.buildCost(type),result=super.place(type,x,y);
    if(result.ok){const delta=cost-TOWERS[type].cost;this.budget-=delta;this.stats.spent+=delta;this.stats.spendTools+=cost;const item=result.tower||this.walls.get(key(x,y));Object.assign(item,{placedAt:this.time,paid:cost});this.checkObjectives();}
    return result;
  }
  upgrade(id) {
    const t=this.towers.find(t=>t.id===id);if(!t)return fail('Select a tower.');
    const raw=TOWERS[t.type].levels[t.level].upgrade;if(!raw)return fail('Maximum level.');
    const cost=this.price(raw);if(this.budget<cost)return fail(`Needs $${cost}k.`);
    this.spend(cost);this.stats.spendTools+=cost;t.paid=(t.paid||0)+cost;t.level++;return ok();
  }
  sell(id) {
    if(this.time-this.lastSale<40)return fail('One sale every 40 seconds.');
    const t=this.towers.find(t=>t.id===id);if(!t)return fail('Select a tower.');
    const refund=Math.round((t.paid||0)*(this.time-t.placedAt<=40?.5:.4));
    this.towers.splice(this.towers.indexOf(t),1);this.map.free(t.x,t.y);this.budget+=refund;this.stats.refunded+=refund;this.lastSale=this.time;return{ok:true,refund};
  }
  wallRefund(item) {
    const integrity=Math.max(0,Math.min(1,(item.hp??180)/(item.maxHp??180)));
    return Math.floor((item.paid||0)*.5*integrity);
  }
  removeWall(x,y) {
    const item=this.walls.get(key(x,y));if(!item)return fail('No firewall there.');
    const refund=this.wallRefund(item);this.walls.delete(key(x,y));this.map.free(x,y);this.budget+=refund;this.stats.refunded+=refund;return{ok:true,refund};
  }
  isolate(id,on=true) {
    const a=this.asset(id);if(!a||!a.discovered)return fail('Select an inventoried system.');
    if(!on){const result=super.isolate(id,false);if(result.ok&&a.vulns.size)this.flags.unsafeReconnect=true;return result;}
    if(a.state!=='ok')return fail(`Cannot unplug while ${a.state}.`);
    const result=this.startJob(a,{kind:'unplug',seconds:10,cost:({startup:5,midcap:8,enterprise:12}[this.org.id]/({startup:.7,midcap:1,enterprise:1.5}[this.org.id]))*2**this.act});
    if(!result.ok)return result;
    a.state='isolated';a.isolatedFor=0;this.say('isolate');
    for(const at of this.attackers)if(at.targetId===id)this.retarget(at);
    this.checkObjectives();return ok();
  }
  installEdr(id) {
    const a=this.asset(id);if(!a?.discovered)return fail('Select an inventoried system.');
    if(a.appliance||!a.canEdr)return fail('Agents cannot run on an appliance.');
    if(a.edr)return fail('Agent already installed.');
    if(['compromised','locked','responding'].includes(a.state))return fail('Clean this system first.');
    return this.startJob(a,{kind:'edr',cost:8+4*a.crit,seconds:8});
  }
  patch(id,vid,emergency=false) {
    const a=this.asset(id);if(!a)return fail('Select a system.');
    this.flags.checkedFix=true;
    const v=this.vuln(vid);
    if(!a.discovered||!v||!a.threats.includes(v)||!a.vulns.has(vid))return fail('No matching unpatched vulnerability on this system.');
    if(!v.patchable)return fail('No vendor patch: isolate or replace this system.');
    const fh=this.fixHour(vid);
    if(fh!==null&&a.state==='isolated') {a.queuedFix={vid,emergency};this.log(`Fix queued for ${a.name} at ${String(fh).padStart(2,'0')}:00.`,'build');return ok();}
    return super.patch(id,vid,emergency);
  }
  irPlan(a,withPatch=false) {
    const f=this.has('retainer')?.5:1;
    const seconds=a.locked?(this.has('spare')?60:120):ACTIONS.irSeconds(a)*f*(this.has('backups')?.5:1);
    const patchVulns=withPatch?[...a.vulns].filter(v=>this.vuln(v)?.patchable&&this.fixHour(v)===null):[];
    return {seconds:seconds+(patchVulns.length?ACTIONS.patchSeconds(a)*.6:0),cost:ACTIONS.irCost(a)*f+(patchVulns.length?ACTIONS.patchCost(a):0),patchVulns};
  }
  respond(id,withPatch=false) {
    const reason=this.responseEligibility(id,withPatch);if(reason)return fail(reason);
    const a=this.asset(id);
    const result=super.respond(id,withPatch);if(result.ok&&a.edr)a.alertCleanedAt=this.time;return result;
  }
  responseEligibility(id,withPatch=true) {
    const a=this.asset(id);
    if(!a?.discovered)return 'Select an inventoried system.';
    if(a.job)return `Work already in progress · ${Math.ceil(a.job.remaining)} simulation seconds left.`;
    if(a.state!=='compromised')return 'No intruder to remove on this system.';
    if(a.locked&&!this.has('backups'))return 'Activate Tested backups in Recover before restoring encrypted files.';
    const cost=this.price(this.irPlan(a,withPatch).cost);
    if(this.budget<cost)return `Needs $${cost}k · available $${Math.floor(this.budget)}k.`;
    if(this.activeJobs()>=this.concurrency())return 'All engineers busy. Wait for a free engineer or fund another shift in Team.';
    return '';
  }
  startHourEarly(){if(this.phase!=='prep')return fail('The hour is already running.');this.earlyCalls++;if(this.hour>=16)this.flags.lateEarly=true;this.beginWave();return{ok:true,bonus:0};}
  beginWave(){
    this.phase='wave';this.phaseTimer=0;this.spawnCursor=0;this.stats.arrivalsThisHour=0;
    this.strip[this.hour]='■';const w=this.waves[this.hour];
    if(w.surge)this.say('surge');
    this.log(`${this.clock()} · ${pressureStage(this.hour)} · ${w.n} representative sources · ${CALENDAR[this.hour][2]}.`,w.surge?'warn':'info');
  }
  endWave(){
    this.budget+=this.accruedIncome;this.stats.earned+=this.accruedIncome;this.accruedIncome=0;
    this.fatigue.busyHours=this.busySeconds/(Math.max(1,this.concurrency())*40)>=.5?this.fatigue.busyHours+1:0;this.busySeconds=0;
    if(this.has('soc2')&&this.fatigue.busyHours>=8&&!this.flags.keepOn){this.fatigue.busyHours=0;this.fatigue.active=false;this.flags.freshUntil=this.time+80;}
    if(this.fatigue.busyHours>=10&&!this.fatigue.active){this.fatigue.active=true;this.say('fatigue');this.queueDilemma('fatigue');}
    this.noise*=.5;this.hour++;
    for(const refund of this.refunds.filter(r=>r.hour<=this.hour)){this.budget+=refund.amount;this.stats.refunded+=refund.amount;}
    this.refunds=this.refunds.filter(r=>r.hour>this.hour);
    if(this.hour>=this.endHour){this.phase='won';if(this.flags.keepOn)this.trust=Math.max(0,this.trust-1);if(this.mode!=='shift')this.say('won');this.checkObjectives();return;}
    this.act=this.hour<6?0:this.hour<16?1:2;this.phase='prep';this.phaseTimer=10;
    if(this.hour===6){this.say('surge');this.advice('Morning handover. Roll out login protection before 09:00.');}
    if(this.hour===7){this.flags.falseAlarm=true;this.log(this.has('intel')?'Intel: that source is our own scanner. Leave it.':'Unknown scan at the portal. Check the source before responding.','warn');}
    if(this.hour===12){
      this.say('review');if(this.impact<15){this.incomeMultiplier=1.2;this.trust=Math.min(5,this.trust+1);this.say('goodreview');}else this.queueDilemma('review');
      const z=this.zeroDays[0];if(z){const a=this.asset(z.assetId);if(a.patchedVulns?.has(z.vulnId)){a.vulns.add(z.vulnId);a.scanStale=true;this.fixAt.set(z.vulnId,14);this.flags.incomplete=true;for(const at of this.attackers)if(at.kind==='scan')this.retarget(at);}}
    }
    if(this.hour===13&&this.flags.incomplete&&this.has('intel'))this.advice('The first fix was incomplete. The second arrives at 14:00.');
    if(this.hour===16){this.say('vendor');this.queueDilemma('vendor');}
    if(this.hour===18&&this.trust===5&&!this.flags.freeProgram){this.flags.freeProgram=true;this.programmes.add('training');this.programReady.set('training',this.time);this.log('Board confidence funds Staff training.','good');}
    if(this.hour===19){this.cleanEstate=[...this.assets.values()].filter(a=>a.exposed).every(a=>!a.vulns.size||(a.state==='isolated'&&a.queuedFix));if(this.cleanEstate)this.log('Clean estate: +10% operating income and a gentler final siege.','good');}
    if(this.flags.freezeRequested){this.flags.freezeRequested=false;this.flags.freezeUntil=this.time+120;}
    if(this.has('intel')&&this.hour<23)this.advice(`Next hour: ${CALENDAR[this.hour+1][2]}.`);
    this.checkObjectives();
  }
  chooseTarget(at){
    const candidates=(this.assetsByVuln.get(at.vuln)||[]).filter(a=>a.exposed&&!a.restricted&&!a.quarantined&&['ok','down','maintenance'].includes(a.state)&&a.vulns.has(at.vuln));
    const reachableServices=[...this.assets.values()].filter(a=>a.exposed&&!a.restricted&&!a.quarantined&&['ok','down','maintenance'].includes(a.state));
    // Encryption stops business service, not necessarily the network listener.
    // Keep incoming scans visible as harmless probes when all live services lock.
    const pool=candidates.length?candidates:reachableServices.length?reachableServices:[...this.assets.values()].filter(a=>a.exposed&&!a.restricted&&!a.quarantined&&['compromised','responding'].includes(a.state));
    const reachable=pool.map(a=>({a,d:this.map.field(a.id,assetDoors(a,this.map.blocked))[key(at.cx,at.cy)]})).filter(x=>x.d>=0).sort((a,b)=>a.d-b.d||a.a.id.localeCompare(b.a.id));
    const breach=reachable.length?[]:pool.map(a=>({a,d:breachField(this.map,a)[key(at.cx,at.cy)]})).filter(x=>Number.isFinite(x.d)).sort((a,b)=>a.d-b.d);
    at.targetId=reachable[0]?.a.id||breach[0]?.a.id||null;at.nextTargetId=reachable[1]?.a.id||null;at.relevant=candidates.length>0;at.turnedAway=!candidates.length;
  }
  retarget(at){const old=at.targetId;this.chooseTarget(at);if(old!==at.targetId){at.retargets=(at.retargets||0)+1;const scale=Math.min(2,1+.15*at.retargets)/Math.min(2,1+.15*(at.retargets-1));at.hp*=scale;at.maxHp*=scale;at.nx=at.cx;at.ny=at.cy;}at.lured=false;}
  spawn(s){super.spawn(s);const at=this.attackers.at(-1);this.scoreTrackSource(at);at.aiThreat=!!s.aiThreat;at.avatar=s.avatar||(at.web?'virus':'beetle');if(at.boss){at.avatar='boss';at.bossName=at.aiThreat?'AI THREAT':'BLACKOUT';if(at.aiThreat)this.stats.aiBosses=(this.stats.aiBosses||0)+1;at.revealed=true;if(this.flags.bossHour!==this.hour){this.flags.bossHour=this.hour;this.say(at.aiThreat?'ai_warning':'bosswarning');this.log(at.aiThreat?'AI THREAT / adaptive shield. Radar reveals it; matching WAF or upgraded IPS finishes it.':'BLACKOUT / armored malware campaign lead incoming. Upgrade IPS; match WAF to web payloads.','warn');}}if(this.cleanEstate&&this.hour>=19){const ratio=(2+(CALENDAR[this.hour][1]-2)*.5)/CALENDAR[this.hour][1];at.hp*=ratio;at.maxHp*=ratio;}}
  spawnLateral(from){
    if(from.supplySource||from.quarantined||from.locked)return;
    const credential=this.rng.chance(.55),ids=credential?from.credTo:[...this.assets.keys()];
    const candidates=ids.map(id=>this.asset(id)).filter(a=>a&&a.id!==from.id&&['ok','down','maintenance'].includes(a.state));
    const target=candidates.sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];if(!target)return;
    if(credential&&(this.has('pam')||this.rng.chance(this.has('hardware')?.95:this.has('mfa')?.8:0))){this.stats.lateralBlocked++;this.scoreOpportunity(target.crit,true);return;}
    if(!credential&&target.edr){this.stats.lateralBlocked++;this.scoreOpportunity(target.crit,true);target.guardAlertAt=this.time;return;}
    const doors=assetDoors(from,this.map.blocked);if(!doors.length)return;const [x,y]=doors[0];
    this.attackers.push({id:this.nextId++,vuln:'T1021 lateral movement',hp:38+this.hour*2,maxHp:38+this.hour*2,speed:1.1,boss:false,kind:'lateral',credential,x,y,cx:x,cy:y,nx:x,ny:y,targetId:target.id,revealed:this.has('awareness'),slow:1,alive:true,web:false,age:0,lured:false,relevant:true,fromId:from.id,ip:''});this.scoreTrackSource(this.attackers.at(-1));
  }
  tickAttackers(dt){
    for(const a of this.attackers){
      if(a.kind==='scan'){const target=this.asset(a.targetId);const states=a.turnedAway?['ok','down','maintenance','compromised','responding']:['ok','down','maintenance'];if(target&&(target.restricted||target.quarantined||!states.includes(target.state)||(!a.turnedAway&&!target.vulns.has(a.vuln))))this.retarget(a);}
      if(a.kind==='lateral'&&a.credential&&a.alive){const target=this.asset(a.targetId);if(!target){a.alive=false;continue;}const dx=target.x+.5-a.x,dy=target.y+.5-a.y,d=Math.hypot(dx,dy);if(d<1.1)this.arrive(a);else{a.x+=dx/d*a.speed*dt;a.y+=dy/d*a.speed*dt;a.cx=Math.round(a.x);a.cy=Math.round(a.y);}a.skipPath=true;}
    }
    advanceNetworkSources(this,dt);
  }
  arrive(at){
    const target=this.asset(at.targetId);if(!target){at.alive=false;return;}
    at.scoreStopped=true;
    if(target.quarantined||target.restricted&&at.kind==='scan'){at.alive=false;this.stats.turnedAway++;return;}
    if(at.kind==='scan'){this.noise=clamp(this.noise+.01*(this.cleanEstate&&at.turnedAway?.5:1),0,.25);if(at.turnedAway){at.scoreStopped=this.scoreExposureClosed(at);at.alive=false;this.stats.turnedAway++;this.stats.probesRepelled++;this.stats.arrived++;if(target.state==='ok'){const wear=1.5*(this.cleanEstate?.5:1);this.impact+=wear*.012;this.fx('probe',target.x+1,target.y+1);}return;}}
    if(at.kind==='lateral') {at.alive=false;this.stats.arrived++;if(target.state!=='ok'&&target.state!=='down'){at.scoreStopped=false;return;}if(at.credential&&this.has('pam')||!at.credential&&target.edr){this.stats.lateralBlocked++;return;}this.damage(target,55,at,null);return;}
    super.arrive(at);if(this.strip[this.hour]!=='✖')this.strip[this.hour]='□';
  }
  hit(at,dmg,tower){return super.hit(at,dmg*(at.aiThreat&&!at.intelRevealed?.6:1),tower);}
  kill(at,tower){if(at.alive)at.scoreStopped=true;super.kill(at,tower);}
  damage(target,dmg,at,v){if(at){at.scoreLanded=true;at.scoreStopped=false;}const before=target.integrity;super.damage(target,dmg*(this.org.id==='startup'?.7:1),at,v);const hitImpact=Math.max(0,before-Math.max(0,target.integrity))*target.crit*.002;this.impact+=hitImpact;this.noteAssetImpact(target,hitImpact,'Attack');if(this.time-(target.lastDamageLog??-10)>3){target.lastDamageLog=this.time;this.log(`${target.name}: ${Math.max(0,before-target.integrity).toFixed(0)} integrity lost · ${at?.social?'social engineering':at?.kind==='lateral'?'internal malware':at?.vuln||'attack'}.`,'damage',{assetId:target.id});}}
  compromise(target,at,v){
    if(target.state==='compromised')return;
    const trustBefore=this.trust,impactBefore=this.impact;
    target.detectedAt=null;
    super.compromise(target,{...at,ip:'observed source'},v);
    this.noteAssetImpact(target,this.impact-impactBefore,target.supplySource?'Supply chain':'Compromise');this.strip[this.hour]='✖';this.say('compromise');
    if(target.crit===3){this.trust=Math.max(0,this.trust-1);this.fx('crown-down',target.x+.5,target.y+.5);this.say('crownpanic');if(trustBefore>=4&&!this.flags.emergencyBudget){this.flags.emergencyBudget=true;this.budget+={startup:40,midcap:60,enterprise:100}[this.org.id];}}
    if(v?.ransomware&&target.crit===3){this.ransomware.push({id:this.nextId++,assetId:target.id,remaining:160,triggered:false});this.say('ransomware_help');}
    this.detect(target); // The incident is visible in the operations feed.
    this.scoreIncident('intrusion',target);
  }
  covered(a){return this.has('awareness')||a.edr||this.towers.some(t=>t.type==='ndr'&&Math.hypot(t.x-a.x,t.y-a.y)<=this.towerRange(t));}
  detect(a){
    if(a.detectedAt!=null)return;a.detectedAt=this.time;if(this.firstDetection==null)this.firstDetection=this.time;
    if(a.personalData&&!this.regulator)this.regulator={startedAt:this.time,deadline:this.time+(this.org.id==='enterprise'?4:24)*40,filed:false,regime:this.org.id==='enterprise'?'DORA':'NIS2'};
    if(a.crit===3&&!this.flags.crownDilemma){this.flags.crownDilemma=true;this.queueDilemma('crown',a.id);}
  }
  credentialReach(id){const seen=new Set(),queue=[id];while(queue.length){const a=this.asset(queue.shift());if(!a||seen.has(a.id)||a.state==='isolated'||a.quarantined)continue;seen.add(a.id);if(a.edr||this.has('pam'))continue;queue.push(...a.credTo);}return[...seen];}
  detonate(r){
    r.triggered=true;this.say('ransom');this.fx('encryption',this.asset(r.assetId)?.x||15,this.asset(r.assetId)?.y||11);this.flags.ransomPrice=Math.round(this.org.budget*.3);
    const encrypted=[];for(const id of this.credentialReach(r.assetId)){const a=this.asset(id);if(a.edr&&a.alertCleanedAt!=null&&this.time-a.alertCleanedAt<=40)continue;
      encrypted.push(a);if(a.job){this.jobs=this.jobs.filter(j=>j!==a.job);a.job=null;}a.locked=true;a.state='compromised';a.integrity=0;a.compromisedAt??=this.time;a.compromisedFor=0;
      // An overt encryption outage identifies the machine even without inventory tooling.
      // Otherwise hidden systems enter the rebuild queue but can never accept response jobs.
      this.discover(a,'ransomware outage');this.detect(a);this.scoreIncident('intrusion',a);
    }
    const encryptionImpact=this.has('backups')?6:12;this.impact+=encryptionImpact;for(const a of encrypted)this.noteAssetImpact(a,encryptionImpact/Math.max(1,encrypted.length),'Ransomware');this.queueDilemma('ransom',r.assetId,true);
  }
  tickSupplyChain(){
    for(const ev of this.supplyChain){
      if(ev.fired||this.hour<ev.hour)continue;const a=this.asset(ev.assetId);if(!a){ev.fired=true;continue;}
      if(this.has('vetting')&&ev.ringUntil==null){ev.ringUntil=this.time+80;this.log('Vendor update held in the test ring for 80 seconds.','warn');continue;}
      if(ev.ringUntil&&this.time<ev.ringUntil)continue;
      ev.fired=true;const ring=this.asset({startup:'es',midcap:'monitor',enterprise:'siem'}[this.org.id]);
      if(ev.ringUntil&&(this.has('intel')||ring?.edr)){this.stats.supplyBlocked++;this.scoreOpportunity(6,true);this.log('Test ring rejected a poisoned update.','good');continue;}
      if(a.state!=='ok')continue;this.stats.supplyEvents++;this.scoreOpportunity(6,false);this.say('supplywave');this.fx('supplychain',a.x+1,a.y+1);a.supplySource=true;this.compromise(a,{vuln:'supply chain: malicious update',ip:'vendor update'},null);
    }
    this.tickInternalWaves();
  }
  tickJobs(dt){
    // Losing a work host must not leave an engineer-led program stuck at Infinity.
    for(const id of ['outside','drill','briefing'])if(this.bought(id)&&this.programReady.get(id)===Infinity&&!this.jobs.some(j=>j.programme===id)){
      this.programmes.delete(id);this.programReady.delete(id);
      if(id==='briefing')this.briefed.delete(this.act);
      this.log(`${PROGRAMS[id].name} interrupted. Reassign from Programs when a healthy system is available.`,'warn');
    }
    const rate=(1-this.noise*(this.has('awareness')?.5:1))*(this.has('awareness')?.95:1)/(1+[...this.assets.values()].filter(a=>a.edr).length*.02);
    for(const job of this.jobs.slice())if(['unplug','programme'].includes(job.kind)){
      job.remaining-=dt*rate;if(job.remaining>0)continue;const a=this.asset(job.assetId);a.job=null;this.jobs.splice(this.jobs.indexOf(job),1);
      if(job.programme==='liaison-evidence')this.finishEvidence();
      if(job.programme?.startsWith('grc-'))this.finishGrc(job.programme.slice(4));
      if(job.programme?.startsWith('human-'))this.finishHumanThreat(job.programme.slice(6));
      if(job.programme==='leak-clean'){if(a.leak)a.leak.active=false;a.quarantined=false;this.log(`${a.name}: collector removed and credentials rotated. Egress restored.`,'good',{assetId:a.id});}
      if(job.kind==='programme'){this.programReady.set(job.programme,this.time);if(['report','forensics'].includes(job.programme)){this.fileIncident(true);this.flags.fileAfter=null;}if(job.programme==='hunt')this.flags.huntOpen=false;if(job.programme==='briefing'){const added=this.impact-this.initialImpact;if(added<(this.lastActImpact??5))this.trust=Math.min(5,this.trust+1);this.lastActImpact=added;this.initialImpact=this.impact;this.say('boardbrief');}if(job.programme==='outside')for(const b of this.assets.values())if(b.exposed){this.discover(b,'outside scan');b.knownVulns=new Set(b.vulns);b.scannedAt=this.time;b.scanStale=false;}}
    }
    const before=this.jobs.filter(j=>j.kind==='ir').map(j=>({job:j,asset:this.asset(j.assetId)}));
    const custom=this.jobs.filter(j=>['unplug','programme'].includes(j.kind));
    this.jobs=this.jobs.filter(j=>!custom.includes(j));
    // Freeze and fatigue affect failure probability only for this campaign, not global constants.
    const original=[ACTIONS.emergencyFailChance,ACTIONS.emergencyFailChanceAppliance];
    const failScale=(this.fatigue.active?2:1)*(this.flags.freezeUntil>this.time?.5:1);
    ACTIONS.emergencyFailChance=original[0]*failScale;ACTIONS.emergencyFailChanceAppliance=original[1]*failScale;
    const patched=this.stats.patched;
    try{super.tickJobs(dt*rate);}finally{[ACTIONS.emergencyFailChance,ACTIONS.emergencyFailChanceAppliance]=original;}
    this.jobs.push(...custom);
    for(const {job,asset} of before)if(!this.jobs.includes(job)){asset.locked=false;asset.supplySource=false;asset.quarantined=false;if(asset.leak)asset.leak.active=false;if(this.has('insurance')){const excess={startup:10,midcap:20,enterprise:30}[this.org.id],paid=this.flags.insuredSpend||0;this.flags.insuredSpend=paid+job.cost;const eligible=Math.max(0,paid+job.cost-excess)-Math.max(0,paid-excess);if(eligible)this.refunds.push({hour:this.hour+1,amount:eligible*.6});}}
    if(this.stats.patched>patched){this.say('patched');for(const at of this.attackers)if(at.kind==='scan')this.retarget(at);}
    for(const a of this.assets.values())if(a.queuedFix&&!a.job&&this.fixHour(a.queuedFix.vid)===null){const q=a.queuedFix;if(this.patch(a.id,q.vid,q.emergency).ok){a.queuedFix=null;a.state='maintenance';}}
    for(const r of this.ransomware)if(!r.triggered&&this.asset(r.assetId).state==='ok')r.cancelled=true;
  }
  tickScanner(dt){
    if(!this.has('scanner'))return;this.scanClock+=dt;
    const interval=this.has('scanner2')?2:4;if(this.scanClock<interval)return;this.scanClock=0;
    const list=[...this.assets.values()].filter(a=>a.discovered),a=list.find(a=>a.knownVulns===null||a.scanStale)||(this.has('scanner2')?list[(this.scanIndex=(this.scanIndex||0)+1)%list.length]:null);
    if(a){a.knownVulns=new Set(a.vulns);a.scannedAt=this.time;a.scanStale=false;}this.checkObjectives();
  }
  tickAssets(dt){
    // Base isolation reconnect applies to revenue systems; campaign applies it to all.
    for(const a of this.assets.values()){
      if(a.state==='isolated'&&a.queuedFix&&this.hour<10)a.isolatedFor=Math.min(a.isolatedFor,60);
      if(a.state==='isolated'&&a.isolatedFor>=80&&!a.queuedFix){a.state='ok';a.isolatedFor=0;this.stats.overrides++;this.flags.unsafeReconnect=true;this.log(`${a.name} reconnected by the business.`,'warn');}
      if(a.state==='compromised'&&this.covered(a))this.detect(a);
      if(a.trusted&&(this.has('pam')&&['remote','vc','gp'].includes(a.id)||this.has('vetting')&&['wsus','ci'].includes(a.id)))a.slowTrust=true;
    }
    const slowed=[...this.assets.values()].filter(a=>a.slowTrust);for(const a of slowed)a.trusted=false;
    super.tickAssets(dt);
    for(const a of slowed){a.trusted=true;a.slowTrust=false;}
  }
  tickTowers(dt){
    // IPS area throughput degrades beyond four simultaneous sources.
    for(const t of this.towers){const n=this.attackers.filter(a=>a.alive&&Math.hypot(a.x-t.x,a.y-t.y)<=this.towerRange(t)).length;t.readout={inRange:n,pct:n>4?Math.pow(4/n,.7):1};}
    for(const t of this.towers.filter(t=>t.type==='ips')){
      t.cooldown-=dt;if(t.cooldown>0)continue;const lv=TOWERS.ips.levels[t.level],buff=this.towers.some(n=>n.type==='ndr'&&n.level>=1&&Math.hypot(n.x-t.x,n.y-t.y)<=this.towerRange(n));
      const targets=this.attackers.filter(a=>a.alive&&Math.hypot(a.x-t.x,a.y-t.y)<=lv.range);
      for(const a of targets){let dmg=lv.damage*t.readout.pct;if(a.web)dmg*=.3;if(!a.revealed&&t.level<2)dmg*=.5;if((a.boss||this.vuln(a.vuln)?.year>=this.currentYear)&&t.level<2)dmg*=.35;if(buff)dmg*=1.25;this.hit(a,dmg,t);}t.cooldown=lv.interval;t.fired+=targets.length;t.target=targets[0]?.id||null;
    }
    const ips=this.towers.filter(t=>t.type==='ips');this.towers=this.towers.filter(t=>t.type!=='ips');super.tickTowers(dt);this.towers.push(...ips);
    for(const at of this.attackers)if(at.alive&&(this.has('awareness')&&at.kind==='lateral'||this.towers.some(t=>t.type==='ndr'&&Math.hypot(t.x-at.x,t.y-at.y)<=this.towerRange(t)))){at.intelRevealed=true;at.revealed=true;}
    for(const t of this.towers.filter(t=>t.type==='waf')){const targets=this.attackers.filter(a=>a.alive&&a.web&&Math.hypot(a.x-t.x,a.y-t.y)<=this.towerRange(t));t.target=targets[0]?.id||null;t.beams=targets.slice(0,12).map(a=>a.id);if(targets.length&&this.time-(t.lastArc??-1)>.4){t.lastArc=this.time;t.fired++;this.fx('waf-audio',t.x,t.y);}}
  }
  tick(dt){
    if(!Number.isFinite(dt)||dt<=0||this.paused||['won','lost'].includes(this.phase))return;
    this.recordScoreInterval(dt);
    this.busySeconds+=this.activeJobs()*dt;this.accruedIncome+=this.hourlyIncome()*dt/40;
    super.tick(dt);
    this.recordScoreState();
    if(['won','lost'].includes(this.phase)){this.performance.finalEvidence=Object.freeze(this.scoreEvidence());if(this.phase==='lost'&&!this.flags.lossSaid){this.flags.lossSaid=true;this.say(this.flags.lossLine||'lost');}return;}
    for(const z of this.zeroDays){if(!z.landed&&this.hour>=z.hour){z.due??=this.time+(this.has('harden')?80:0);this.fixAt.set(z.vulnId,z.hour+3);if(this.time>=z.due){z.landed=true;const a=this.asset(z.assetId);a.vulns.add(z.vulnId);a.scanStale=true;this.say('zero');this.advice(`No fix for ${a.name} until ${z.hour+3}:00. Contain it.`);}}}
    for(const r of this.ransomware)if(!r.triggered&&!r.cancelled){r.remaining-=dt;if(r.remaining<=0)this.detonate(r);}
    if(this.flags.payUntil&&this.time>=this.flags.payUntil){this.flags.payUntil=null;const locked=[...this.assets.values()].filter(a=>a.locked).sort((a,b)=>b.revenue-a.revenue);for(const a of locked.slice(2)){a.locked=false;a.state='ok';a.integrity=65;}}
    if(this.flags.negotiating&&this.time>=this.flags.negotiateUntil){this.flags.negotiating=false;this.flags.ransomPrice=Math.round(this.flags.ransomPrice/2);this.queueDilemma('ransom',null,true);}
    if(this.flags.leakAt&&this.time>=this.flags.leakAt&&!this.flags.paid&&!this.flags.rebuildChosen&&!this.flags.leaked){this.flags.leaked=true;this.impact+=12;this.trust=Math.max(0,this.trust-1);this.log('The extortion deadline passed. Data was leaked.','fail');}
    if(this.flags.restUntil&&this.time>=this.flags.restUntil){this.flags.restUntil=0;this.fatigue={busyHours:0,active:false};}
    if(this.hour>=(this.org.id==='startup'?8:6)&&this.time>=(this.flags.nextPasswordAt||0)){
      this.flags.nextPasswordAt=this.time+(this.hour<16?this.pacing.passwordEarly:this.pacing.passwordLate);this.socialEngineering();
    }
    if(this.flags.huntOpen&&this.time>=(this.flags.vendorHopAt||0)){this.flags.vendorHopAt=this.time+20;const from=this.asset(this.vendorAsset);if(from)this.spawnLateral(from);}
    if(this.flags.containDeadline&&this.time>=this.flags.containDeadline){this.flags.containDeadline=null;const a=this.asset(this.flags.containAsset);if(a?.state==='compromised'){this.trust=Math.max(0,this.trust-1);this.log('Contain-and-watch deadline missed. Board trust −1.','fail');}}
    if(this.flags.pendingReport&&this.activeJobs()<this.concurrency()){this.flags.pendingReport=false;this.fileIncident();}
    this.flags.rolloutLogged??={};
    for(const [id,ready]of this.programReady)if(ready<=this.time&&PROGRAMS[id]?.seconds&&!['outside','drill','briefing'].includes(id)&&this.flags.rolloutLogged[id]!==ready){this.flags.rolloutLogged[id]=ready;this.log(`${PROGRAMS[id].name} rollout complete · protection active.`,'good');}
    this.tickIncidents(dt);this.tickHumanThreats(dt);this.tickGrc();this.tickEvidence();this.tickEngineering();this.tickCoaching();this.dispatchRecovery();this.openNextDilemma();this.checkObjectives();this.recordScoreState();
  }
  queueDilemma(family,assetId=null,urgent=false){
    if(!urgent&&(this.dilemmaHistory.some(d=>d.family===family&&d.act===this.act)||this.dilemmaQueue.some(d=>d.family===family)))return;
    const d={id:this.nextId++,family,assetId,act:this.act};if(urgent){if(this.pendingDilemma)this.dilemmaQueue.unshift(this.pendingDilemma);this.pendingDilemma=d;this.describeDilemma(d);}else this.dilemmaQueue.push(d);
  }
  openNextDilemma(){if(this.pendingDilemma||this.phase!=='prep'||this.waves[this.hour]?.surge||this.time-this.lastDilemmaAt<80)return;const d=this.dilemmaQueue.shift();if(d){this.pendingDilemma=d;this.describeDilemma(d);}}
  describeDilemma(d){
    const choice=(id,label,consequence,enabled=true,requires='')=>({id,label,consequence,enabled,requires});
    const enough=this.budget>=(this.flags.ransomPrice||0);
    const content={
      crown:['Crown jewel down','A critical system is compromised. Decide how to report and recover.','board',[choice('file','File and rebuild','File now. Trust +1; worst-case disclosure adds 4 impact.'),choice('image','Image, then file','40 seconds of evidence collection. Movement continues.'),choice('contain','Contain and watch','File, observe, and start response before the next hour.',this.has('awareness'),'SIEM required')]],
      review:['The noon review',`Business impact is ${this.impact.toFixed(1)}. The board wants a number.`,'board',[choice('defend','Defend the number','Income −15% through midnight.'),choice('concede','Concede','Income −25%. Board trust +1.')]],
      vendor:['Vendor logins leaked','A vendor password is public. The paste does not say which.','business',[choice('reset','Reset all passwords','Income −20% this hour. Stops the leaked account.'),choice('hunt','Hunt with logs','80 seconds of engineer time to close the account.',this.has('awareness')&&this.time-(this.programReady.get('awareness')||0)>=80,'SIEM active for 80s'),choice('cut','Cut vendor access','Lose that vendor’s patches. Replacement takes twice as long.')]],
      fatigue:['The team is spent','Ten busy hours. Slower changes, more mistakes. Your team needs a decision.','engineer',[choice('rest','Send them home','One fewer engineer for 160s. Resets fatigue.'),choice('keep','Keep them on','Fatigue persists. Lose one trust at midnight.'),choice('surge','Call the surge','$60k. Fresh team in 80s.',this.has('retainer')&&this.budget>=this.price(60),'Responders and budget required')]],
      ransom:['Your files are encrypted',`A ransomware operator demands $${this.flags.ransomPrice}k. Systems remain offline.`,'criminal',[choice('pay','Pay',`$${this.flags.ransomPrice}k. Two largest systems still need rebuilding. Trust −1.`,enough&&(this.has('insurance')||this.has('comms')),'Insurance or lawyers, and enough budget'),choice('rebuild','Rebuild','Use tested backups. Queue recovery with your available engineers.',this.has('backups'),'Tested backups required'),choice('negotiate','Negotiate','80s offline. Half the price. A leak deadline starts.',this.has('drill')&&!this.flags.negotiated,'Incident drill required'),choice('contain','Contain damage','Keep systems locked. Return to fund backups and recovery.')]],
    };
    const [title,cause,speaker,choices]=content[d.family];Object.assign(d,{title,cause,speaker,choices});
  }
  choose(id,choiceId){
    const d=this.pendingDilemma;if(!d||d.id!==id)return fail('This decision is no longer active.');this.describeDilemma(d);const c=d.choices.find(c=>c.id===choiceId);if(!c?.enabled)return fail(c?.requires||'Choose an available response.');
    this.resolving=true;
    if(d.family==='review'){this.incomeMultiplier=choiceId==='defend'?.85:.75;if(choiceId==='concede')this.trust=Math.min(5,this.trust+1);}
    if(d.family==='crown'){
      if(choiceId==='image'){const a=this.asset(d.assetId);const r=this.startJob(a,{kind:'programme',programme:'forensics',seconds:40,cost:0});if(!r.ok){this.resolving=false;return r;}this.programmes.add('forensics');this.flags.fileAfter=this.time+a.job.remaining;}
      else{const r=this.fileIncident();if(!r.ok){this.resolving=false;return r;}if(choiceId==='file'){this.impact+=4;this.trust=Math.min(5,this.trust+1);}else{this.flags.containDeadline=this.time+40;this.flags.containAsset=d.assetId;}}
    }
    if(d.family==='vendor'){this.vendorAsset=[...this.assets.values()].find(a=>a.trusted&&a.exposed)?.id;
      if(choiceId==='reset')this.flags.passwordResetHour=this.hour;
      if(choiceId==='cut')this.flags.vendorCut=true;
      if(choiceId==='hunt'){const a=this.asset(this.identityId);const r=this.startJob(a,{kind:'programme',programme:'hunt',seconds:80,cost:0});if(!r.ok){this.resolving=false;return r;}this.flags.huntOpen=true;this.programmes.add('hunt');}
    }
    if(d.family==='fatigue'){if(choiceId==='rest')this.flags.restUntil=this.time+160;if(choiceId==='keep')this.flags.keepOn=true;if(choiceId==='surge'){this.spend(this.price(60));this.stats.spendPeople+=this.price(60);this.flags.restUntil=this.time+80;}}
    if(d.family==='ransom'){
      if(choiceId==='pay'){this.spend(this.flags.ransomPrice);this.flags.paid=true;this.flags.payUntil=this.time+80;this.trust=Math.max(0,this.trust-1);this.fileIncident();this.say('pay');}
      if(choiceId==='rebuild'){this.flags.rebuildChosen=true;this.recoveryQueue=[...this.assets.values()].filter(a=>a.locked).sort((a,b)=>b.revenue-a.revenue).map(a=>a.id);this.dispatchRecovery();}
      if(choiceId==='negotiate'){this.flags.negotiating=true;this.flags.negotiated=true;this.flags.negotiateUntil=this.time+80;this.flags.leakAt=this.time+Math.max(80,(22-this.hour)*40)+(this.has('comms')?80:0);}
    }
    this.dilemmaHistory.push({...d,choiceId});this.lastDilemmaAt=this.time;this.pendingDilemma=null;this.resolving=false;return ok();
  }
  dispatchRecovery(){
    if(!this.recoveryQueue?.length)return;
    this.recoveryQueue=this.recoveryQueue.filter(id=>this.asset(id)?.locked&&this.asset(id).job?.kind!=='ir');
    for(const id of this.recoveryQueue.slice()){
      if(this.activeJobs()>=this.concurrency())break;
      if(this.asset(id).job)continue;
      if(this.respond(id,true).ok)this.recoveryQueue=this.recoveryQueue.filter(x=>x!==id);
    }
  }
  ransomwareStatus(){
    const locked=[...this.assets.values()].filter(a=>a.locked);
    const dwell=this.ransomware.filter(r=>!r.triggered&&!r.cancelled);
    return {locked,dwell,queued:this.recoveryQueue||[],restoring:locked.filter(a=>a.job?.kind==='ir'),stage:locked.length?'encrypted':dwell.length?'foothold':'clear'};
  }
  fileIncident(immediate=false){
    if(!this.regulator)return fail('No reportable incident detected.');if(this.regulator.filed)return ok();
    if(immediate||this.has('comms')){this.regulator.filed=true;this.regulator.filedAt=this.time;return ok();}
    if(this.jobs.some(j=>j.programme==='report'))return ok();
    if(this.activeJobs()>=this.concurrency()){this.flags.pendingReport=true;this.log('Incident report queued for the next available engineer.','warn');return ok();}
    const free=[...this.assets.values()].find(a=>a.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job);
    if(!free)return fail('Restore a healthy system for incident reporting.');
    return this.startJob(free,{kind:'programme',programme:'report',seconds:this.evidenceReady()?10:20,cost:0});
  }
  freezeChanges(){if(this.flags.freezeRequested||this.flags.freezeUntil>this.time)return fail('A change freeze is already queued or active.');this.flags.freezeRequested=true;this.log('Change freeze requested: takes effect next hour for 120 seconds.','info');return ok();}
  countdowns(){const out=[];if(this.regulator&&!this.regulator.filed)out.push({id:'regulator',kind:'regulator',remaining:this.regulator.deadline-this.time,visible:true});for(const r of this.ransomware)if(!r.triggered&&!r.cancelled)out.push({...r,kind:'ransomware',visible:this.covered(this.asset(r.assetId))});for(const a of this.assets.values())if(a.state==='isolated')out.push({id:`reconnect-${a.id}`,kind:'reconnect',assetId:a.id,remaining:Math.max(0,80-a.isolatedFor),visible:true});return out;}
  objectives(){return[
    {id:'contain',text:'Unplug or fix the exposed system',done:!!this.flags.contained},
    {id:'scan',text:'Buy a Scanner',done:this.bought('scanner')},
    {id:'discover',text:'Find the unlisted systems',done:[...this.assets.values()].filter(a=>a.shadow).every(a=>a.discovered)},
    {id:'fix',text:'Check when the vendor fix arrives',done:!!this.flags.checkedFix},
    {id:'radar',text:'Build a threat intel tower near an uplink',done:this.towers.some(t=>t.type==='ndr'&&!t.starter&&t.x<9)},
    {id:'hold',text:'Reach 06:00 with impact under five',done:this.hour>=6&&this.impact<5},
  ];}
  checkObjectives(){if(this.asset(this.firstAssetId)?.state==='isolated'||this.stats.patched)this.flags.contained=true;for(const o of this.objectives())if(o.done&&!this.rewarded.has(o.id)){this.rewarded.add(o.id);this.budget+=this.price(5);this.stats.earned+=this.price(5);}}
  estate(){return{busy:this.activeJobs(),engineers:this.concurrency()};}
  score(){return this.scoreBreakdown().reduce((s,c)=>s+c.value,0);}
  rank(score=this.score()){if(this.phase==='lost')return'Breached';if(this.flags.paid&&score>=5500)return'Held the line';return score>=9000?'Board-ready':score>=7500?'Ran a tight ship':score>=5500?'Held the line':score>=3000?'Survived':'Breached';}
  shareCard(){return{date:this.model.day,company:this.org.name,modifier:this.modifier.label,strip:this.strip.join(''),rank:this.rank(),score:this.score(),url:'https://zerodayclock.com',badges:[...(this.stats.compromises===0?['Clean day']:[]),...(!this.flags.paid?['Never paid']:[]),...(this.cleanEstate?['Clean estate']:[])]};}
  postmortem(){const a=[...this.assets.values()].filter(a=>a.compromisedBy).sort((a,b)=>b.crit-a.crit)[0],v=a?this.vuln(a.compromisedBy):null;return{downedBy:a?{cve:a.compromisedBy,product:a.product,hour:this.hour,sources:v?.ips||0}:null,counterfactual:{text:!this.has('backups')?'Tested backups turn encryption into a recovery job.':!this.has('mfa')?'A login check blocks most stolen-credential movement.':'Patch order steers traffic. Protect the next target before the current one falls.'},spendTools:this.stats.spendTools,spendPeople:this.stats.spendPeople,maxim:'A wall stops packets. It does not stop a stolen password.'};}
}
Object.assign(Campaign.prototype,evidenceMethods,engineeringMethods,humanThreatMethods,grcMethods,incidentMethods,coachingMethods,scoringMethods);
