import {PROGRAMS} from '../sim/campaign-rules.js';

// Only prioritize information the player has actually discovered.
export function assetUrgency(a){
 if(a.locked)return 6;
 if(a.state==='compromised'||a.supplySource||a.leak?.active&&a.leak.detected)return 5;
 if(a.state==='down')return 4;
 if(a.state==='responding'||a.quarantined||a.state==='isolated')return 3;
 if(a.knownVulns?.size)return 2;
 return 0;
}
export function sortedAssets(g){return [...g.assets.values()].filter(a=>a.discovered).sort((a,b)=>assetUrgency(b)-assetUrgency(a)||b.crit-a.crit||b.revenue-a.revenue||a.name.localeCompare(b.name));}
export function workLedger(g){
 const rows=g.jobs.map(j=>{const incident=g.humanThreats?.find(t=>j.programme==='human-'+t.id);return{id:'job-'+j.assetId+'-'+j.kind,assetId:j.assetId,name:({'liaison-evidence':'Preserve & review incident logs',report:'Incident report',forensics:'Forensic image & report',hunt:'Vendor credential hunt','leak-clean':'Remove data collector','grc-inventory':'Asset register evidence','grc-recovery':'Recovery evidence','grc-attestation':'Board risk attestation'}[j.programme])||(incident?(incident.kind==='worker-fraud'?'Worker-fraud investigation':'Insider investigation'):PROGRAMS[j.programme]?.name||({'ir':'Incident recovery',patch:'Patch',edr:'Deploy EDR',scan:'Scan',replace:'Replace system'}[j.kind]||j.programme||j.kind)),detail:g.asset(j.assetId)?.name||'Engineering',left:j.remaining,total:j.total,kind:'engineer'};});
 for(const [id,ready]of g.programReady)if(ready>g.time&&Number.isFinite(ready)&&PROGRAMS[id])rows.push({id:'program-'+id,name:PROGRAMS[id].name,detail:'Company-wide rollout',left:ready-g.time,total:PROGRAMS[id].seconds,kind:'rollout'});
 for(const a of g.assets.values())if(a.discovered&&!a.job){if(a.queuedFix)rows.push({id:'fix-'+a.id,assetId:a.id,name:'Patch queued',detail:a.name+' · awaiting vendor fix',kind:'queued'});if(g.recoveryQueue?.includes(a.id))rows.push({id:'rebuild-'+a.id,assetId:a.id,name:'Recovery queued',detail:a.name+' · awaiting engineer / budget',kind:'queued'});}
 if(g.flags.pendingReport)rows.push({id:'queued-report',name:'Incident report queued',detail:'Awaiting an available engineer',kind:'queued'});
 if(g.flags.freezeRequested)rows.push({id:'change-freeze',name:'Change freeze queued',detail:'Starts next hour · no engineer required',kind:'queued'});
 else if(g.flags.freezeUntil>g.time)rows.push({id:'change-freeze',name:'Change freeze active',detail:'Lower emergency-change risk; slower emergency patching',kind:'rollout',left:g.flags.freezeUntil-g.time,total:120});
 return rows;
}
export function timeRemaining(g){
 const [h,m]=g.clock().split(':').map(Number);
 const minutes=Math.max(0,g.endHour*60-h*60-m);
 return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m left`;
}
const mouse=(part,extra='')=>`<svg viewBox="0 0 40 42" aria-hidden="true"><rect x="9" y="3" width="22" height="33" rx="10"/><path d="M9 17h22M20 3v14"/>${part==='left'?'<path class="lit" d="M18 6c-5 0-6 3-6 8h6z"/>':part==='right'?'<path class="lit" d="M22 6c5 0 6 3 6 8h-6z"/>':'<rect class="lit" x="18" y="7" width="4" height="7" rx="2"/>'}${extra}</svg>`;
export const navigationVisuals=()=>`<nav class="mouse-guide glass" aria-label="Map controls">${[
 ['Left click: select a building or place the selected control',mouse('left'),'Select / build'],
 ['Right click: cancel selection',mouse('right'),'Cancel'],
 ['Left drag: pan the map',mouse('left','<path d="M2 23v-5m0 0 3 3m-3-3-2 3M35 25v6m0 0 3-3m-3 3-3-3"/>'),'Pan'],
 ['Right drag: orbit the map',mouse('right','<path d="M5 32c-5 8 34 9 31 0m0 0-4 2m4-2 1 4"/>'),'Orbit'],
 ['Mouse wheel: zoom',mouse('wheel','<path d="M35 8v18m-3-15 3-3 3 3m-6 12 3 3 3-3"/>'),'Zoom'],
 ].map(([help,icon,label])=>`<span tabindex="0" role="img" aria-label="${help}" title="${help}">${icon}<small>${label}</small></span>`).join('')}</nav>`;
