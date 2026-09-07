import { ICON } from './icons.js';
import { activeThreats, renderActiveThreats } from './active-threats.js';
import { workLedger } from './operations.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,id='',reason='')=>`<button data-action="${action}" ${action==='activity'?'aria-label="Hide Operations"':''} data-id="${esc(id)}" ${reason?`disabled title="${esc(reason)}"`:''}>${esc(label)}</button>`;
export function operationsCounts(g){
 const rows=operationCards(g).filter(r=>!r.archive);
 return {threats:rows.filter(r=>r.kind==='threat').length,governance:rows.filter(r=>r.kind==='request').length,work:workLedger(g).length};
}
export function renderEvidence(g,speed){
 const e=g.evidence;if(!e)return '';
 if(e.state==='deferred')return `<article class="ops-task"><b>FBI logs · deferred</b><p>No penalty. Reopen when response capacity is available.</p>${button('evidence-defer','Reopen optional request')}</article>`;
 const reason=g.evidenceEligibility(),state={deferred:'DEFERRED',requested:'OPTIONAL',working:'COLLECTING',ready:'DECISION READY',shared:'SHARED',retained:'LOCAL ONLY'}[e.state];
 return `<article class="ops-task evidence-task"><div class="ops-task-heading"><b>FBI · incident logs</b><span>${state}</span></div><p>${e.state==='working'?'Engineer preserving logs and reviewing sensitive content.':e.state==='shared'?'Reviewed packet shared in-game. This does not stop the attack or replace regulator reporting.':g.evidenceReady()?'Packet preserved locally. Future incident reports need 10s rather than 20s.':'Optional preparation: 1 engineer · 20s of work. Future incident reports take half the time. No deadline or penalty for declining.'}</p>${e.state==='requested'?button('evidence-defer','Not now')+' '+button('evidence-prepare',`Preserve & review · $${Math.round(g.price(5))}k · ~${Math.ceil(20/(speed*.75))}s`,'',reason)+(reason?`<small>${esc(reason)}</small>`:''):''}${['ready','retained'].includes(e.state)?`<p>Share reviewed logs: recover up to 1 trust, once. Evidence leaves your organization in the story; no live data is sent. Keeping it local has no trust penalty.</p><div class="incident-actions">${button('evidence-share','Share reviewed packet')}${e.state==='ready'?button('evidence-retain','Keep local'):''}</div>`:''}<small>Does not contain malware, restore systems, or cancel reporting duties.</small></article>`;
}
export function operationCards(g,speed=1){
 const sec=t=>Math.max(0,Math.ceil(t/(.75*speed)));
 const cards=[];
 if(g.pendingDilemma){g.describeDilemma(g.pendingDilemma);cards.push({id:'decision',kind:'request',title:g.pendingDilemma.title,meta:'Board decision · choose a response',state:'DECISION',priority:-2,icon:'ciso',track:'Actions',detail:'<p>'+esc(g.pendingDilemma.cause)+'</p>'+g.pendingDilemma.choices.map(c=>button('choose',c.label,c.id,c.enabled?'':c.requires)+'<small>'+esc(c.consequence)+'</small>').join('')});}
 for(const r of activeThreats(g)){
  const critical=r.state==='active',asset=r.assetId&&g.asset(r.assetId);
  cards.push({id:r.id,kind:'threat',title:r.label,meta:r.source,state:r.state==='investigating'?'IN PROGRESS':r.state.toUpperCase(),priority:critical?0:3,critical,rank:-(asset?.crit||0),icon:r.kind==='supply'?'supply':'ips',assetId:r.assetId,track:r.kind==='leak'?'Detect':r.kind==='worker-fraud'||r.kind==='insider'?'Protect':'Recover',next:r.next,detail:renderActiveThreats([r],g,speed)});
 }
 if(g.regulator&&!g.regulator.filed){const remaining=g.regulator.deadline-g.time,filing=g.jobs.some(j=>j.programme==='report'),queued=g.flags.pendingReport;cards.push({id:'reg-report',kind:'request',title:'File incident report',meta:'Regulator · '+(remaining<0?'overdue':sec(remaining)+'s to deadline'),state:filing?'FILING':queued?'QUEUED':remaining<0?'OVERDUE':'TO DO',priority:remaining<30?-1:1,rank:remaining,track:'Govern',icon:'dashboard',detail:'<p>Separate from FBI cooperation. Uses an engineer unless lawyers handle it.</p>'+button('file','File report')});}
 for(const t of (g.grc||[]).filter(t=>t.state!=='done')){
  const host=[...g.assets.values()].some(a=>a.discovered&&a.state==='ok'&&!a.quarantined&&!a.job);
  const reason=!g.grcRequirement(t.id)?t.requirement:g.budget<g.price(t.cost)?'Not enough budget':g.activeJobs()>=g.concurrency()?'All engineers busy':!host?'Restore an available system':'';
  const remaining=t.deadline-g.time;
  cards.push({id:'grc-'+t.id,kind:'request',title:t.name,meta:'Regulator · '+(t.state==='pending'?'evidence required':t.state==='working'?'engineer assigned':'board sign-off'),state:t.state==='board-review'?'REVIEW · '+sec(t.reviewUntil-g.time)+'s':t.state==='working'?'IN PROGRESS':t.missed?'OVERDUE':sec(remaining)+'s LEFT',priority:t.state!=='pending'?4:t.missed||remaining<30?-1:1,rank:remaining,track:'Govern',icon:'vetting',detail:'<p>'+esc(t.requirement)+'</p>'+(t.state==='pending'?button('grc-start','Prepare · $'+Math.round(g.price(t.cost))+'k',t.id,reason)+(reason?'<small>'+esc(reason)+'</small>':''):'<p>Evidence is underway. You can keep responding to threats.</p>')});
 }
 if(g.evidence){
  const e=g.evidence,done=['retained','deferred','shared'].includes(e.state);
  cards.push({id:'fbi-evidence',kind:'request',title:'FBI · incident logs',meta:'Optional · '+({requested:'preserve before sharing',working:'engineer collecting logs',ready:'choose whether to share',retained:'kept locally',deferred:'reopen any time',shared:'cooperation complete'}[e.state]),state:{requested:'OPTIONAL',working:'IN PROGRESS',ready:'REVIEW',retained:'LOCAL',deferred:'DEFERRED',shared:'DONE'}[e.state],priority:done?9:5,archive:done,track:'Govern',icon:'vetting',detail:renderEvidence(g,speed)});
 }
 const offer=g.offerDetails();if(offer)cards.push({id:'vendor-offer',kind:'request',title:'Emergency offer · '+offer.name,meta:'Optional · $'+Math.round(offer.price)+'k',state:sec(offer.expires-g.time)+'s LEFT',priority:5,track:'Actions',icon:'dashboard',detail:'<p>Quoted offer. Uses the same program and rollout as the regular catalog.</p>'+button('vendor-buy','Accept offer')+button('vendor-regular','Find regular program')});
 if(g.flags.freezeRequested||g.flags.freezeUntil>g.time)cards.push({id:'change-freeze',kind:'request',title:'Change freeze',meta:'Govern · emergency patches are safer but slower',state:g.flags.freezeRequested?'QUEUED':'ACTIVE',priority:7,track:'Govern',icon:'dashboard',detail:'<p>'+ (g.flags.freezeRequested?'Starts next hour.':'Active for '+sec(g.flags.freezeUntil-g.time)+'s.')+'</p>'});
 return cards.sort((a,b)=>a.priority-b.priority||(a.rank||0)-(b.rank||0));
}
export function renderOperations(g,speed=1,history=false,view='all'){
 const cards=operationCards(g,speed).filter(r=>!r.archive),events=g.events.slice(-30).reverse();
 const rows=cards.map(r=>'<article class="ops-card '+r.kind+(r.critical?' critical':'')+'" id="ops-'+esc(r.id)+'"><button class="ops-card-head" data-action="operation-action" data-id="'+esc(r.id)+'" title="Open this action on the left"><span class="ops-card-icon">'+ICON[r.icon]+'</span><span class="ops-card-copy"><small class="ops-kind">'+(r.kind==='threat'?'THREAT':'REQUEST')+'</small><b>'+esc(r.title)+'</b><small>'+esc(r.meta)+'</small></span><span class="ops-card-status">'+esc(r.state)+'</span><span class="ops-card-chevron" aria-hidden="true">↗</span></button></article>').join('');
 const log='<div class="ops-history-list"><div class="log-entries">'+events.map(e=>'<div class="ops-event '+esc(e.level)+'"><time>'+esc(e.clock)+'</time><span>'+esc(e.text)+'</span>'+(e.assetId?button('select','Locate ↗',e.assetId):'')+'</div>').join('')+'</div>';
 const guide=!g.bought('scanner')&&!cards.some(c=>c.priority<=1)?'<div class="ops-start"><div class="eyebrow">FIRST STEP</div><b>Map your exposure.</b><p>Get a Scanner. Then cover all three uplinks.</p>'+button('threat-program','Open Find programs ↗','Visibility')+'</div>':'';
 return '<div class="section-head ops-heading"><div><b>OPERATIONS</b><small>PRIORITY FEED · '+cards.length+' OPEN</small></div>'+button('activity','×')+'</div><nav class="ops-tabs" aria-label="Operations views"><button data-action="ops-view" data-id="all" aria-pressed="'+!history+'">Threats & requests</button><button data-action="ops-history" aria-pressed="'+history+'">Activity</button></nav><div class="ops-scroll">'+(history?log:guide+rows+(!cards.length&&!guide?'<div class="ops-empty"><strong>No outstanding incidents.</strong>Stay ready for the next wave.</div>':''))+'</div><div class="ops-footer"><span>Click an item → act on the left</span>'+button('track','Actions ↗','Actions')+'</div>';
}
