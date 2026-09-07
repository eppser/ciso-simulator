import {operationTrack} from './program-taxonomy.js';
import {ICON} from './icons.js';
import {operationCards} from './operations-center.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Every management mutation has a discoverable Programs route. Targeted actions
// stay in the inspector so costs/preconditions cannot diverge between surfaces.
export const ACTION_DIRECTORY=[
 {id:'systems',title:'Contain, patch & recover',actions:['quarantine','restrict','leak-clean','patch','emergency','isolate','reconnect','replace','edr','respond'],route:'assets',detail:'Choose a system: quarantine, unplug/reconnect, disable public access, patch, emergency change, replace, EDR, remove intruders or restore backups. Costs and prerequisites are shown on that system.'},
 {id:'controls',title:'Build & manage defenses',actions:['build','upgrade','sell','remove-wall'],route:'build',detail:'Place a control on a free tile. Select an existing control to upgrade, sell, or remove its segment. Build prices and upgrade costs come from the same catalog.'},
 {id:'people',title:'Staffing & response capacity',actions:['buy'],route:'team',detail:'Hire shifts, retain responders and run an incident drill. Engineers, costs and completed rollouts are shared with Operations.'},
 {id:'governance',title:'Reporting & change control',actions:['file','freeze','grc-start'],route:'requests',detail:'File incident reports, assemble regulator evidence, or request a change freeze. Freeze lowers emergency-change risk but slows emergency patching.'},
 {id:'evidence',title:'FBI evidence & sharing',actions:['evidence-prepare','evidence-share','evidence-retain','evidence-defer'],route:'requests',detail:'Available after a liaison request. Preserve reviewed logs, keep local, share once, or defer without penalty. This never contains malware or replaces reporting.'},
 {id:'human',title:'Workforce investigations',actions:['human-contain','human-investigate'],route:'threats',detail:'Once verified: revoke account access and hold payments for free, then pay for an engineer to investigate and close the case. Training and hiring checks prevent future cases.'},
 {id:'decisions',title:'Incident decisions & offers',actions:['choose','vendor-buy'],route:'requests',detail:'Contextual choices include ransomware recovery/payment/negotiation, vendor access, board reviews and team fatigue. Emergency vendor offers use the normal program rollout with a higher quoted price.'},
];
export function renderActionDirectory(g,speed=1,track='Actions'){
 const all=operationCards(g,speed),rows=all.filter(r=>(track==='Actions'?!r.archive:operationTrack(r)===track)&&!['change-freeze','reg-report'].includes(r.id));
 const card=(id,title,state,detail,icon='dashboard',category='Govern')=>'<article id="program-'+esc(id)+'" class="program-card action-card"><div><span class="action-icon">'+ICON[icon]+'</span><b>'+esc(title)+'</b><strong>'+esc(state)+'</strong></div><small class="action-category">'+esc(category)+'</small><div class="action-live-detail">'+detail.replace(/ id="([^"]+)"/g,' id="program-$1"')+'</div></article>';
 let html=rows.map(r=>card(r.id,r.title,r.state,r.detail,r.icon,operationTrack(r))).join('');
 if(track==='Respond'||track==='Actions'&&g.regulator&&!g.regulator.filed){
  const working=g.jobs.some(j=>j.programme==='report'),queued=g.flags.pendingReport;
  const state=g.regulator?.filed?'Filed':working?'In progress':queued?'Queued':!g.regulator?'No incident':'$0k';
  html+=card('reg-report','File incident report',state,'<p>Notify the regulator. '+(g.has('comms')?'Lawyers file immediately.':'One engineer · '+(g.evidenceReady()?'10':'20')+'s. Queues if engineers are busy.')+' Separate from optional FBI sharing.</p><button data-action="file" '+(!g.regulator||g.regulator.filed||working||queued?'disabled':'')+'>'+(!g.regulator?'Available after a reportable incident':working?'Filing report':queued?'Waiting for an engineer':g.regulator.filed?'Report filed':'File incident report')+'</button>','dashboard','Respond');
 }
 if(track==='Govern'||track==='Actions'&&(g.flags.freezeRequested||g.flags.freezeUntil>g.time)){
  const state=g.flags.freezeRequested?'Queued':g.flags.freezeUntil>g.time?'Active':'$0k';
  html+=card('change-freeze','Request change freeze',state,'<p>Starts next hour for 120s. Halves emergency-change failure risk but makes emergency patches 40% slower. No engineer needed.</p><button data-action="freeze" '+(state!=='$0k'?'disabled':'')+'>'+(state==='Queued'?'Change freeze queued':state==='Active'?'Change freeze active':'Request change freeze')+'</button>');
 }
 return html||(track==='Actions'?'<div class="panel-heading"><span>Actions</span><small>LIVE PRIORITIES</small></div><p class="panel-note">No response needed yet. Start with Identify → Scanner. Incident actions appear here when needed; preparation programs stay in their categories.</p>':'');
}
