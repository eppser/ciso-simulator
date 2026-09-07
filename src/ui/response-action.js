const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Read the exact simulation gate, not a second set of UI-only eligibility rules.
export function responseAction(g,a,speed=1){
 const reason=g.responseEligibility(a.id,true),plan=g.irPlan(a,true);
 const cost=g.price(plan.cost),seconds=Math.ceil(plan.seconds*g.jobSpeed()/(.75*speed));
 const working=a.job?.kind==='ir';
 if(working)return '<div class="response-order"><button data-action="respond" class="primary" disabled>Recovery in progress</button><small>Spread stopped. Your engineer is cleaning this system.</small></div>';
 const label=working?'Recovery in progress':a.locked?'Restore encrypted files':plan.patchVulns.length?'Remove intruder + patch':'Remove intruder';
 return `<div class="response-order"><button data-action="respond" class="primary" ${reason?'disabled':''} aria-describedby="response-reason" title="${esc(reason||'Assign one engineer to contain and clean this system')}">${label}${working?'':` · $${cost}k`}</button><small>1 engineer · ~${seconds}s${plan.patchVulns.length?' · includes available patches':a.vulns.size?' · unavailable patches are not included':''}</small>${reason?`<p id="response-reason" class="action-reason">${esc(reason)}</p>`:''}${a.locked&&!g.has('backups')?'<button data-action="threat-program" data-id="Recover">Open Tested backups ↗</button>':reason.includes('engineers busy')?'<button data-action="team">Open engineering team ↗</button>':''}</div>`;
}
