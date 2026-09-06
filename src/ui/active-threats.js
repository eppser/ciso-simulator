// One sanitized incident read-model for the operations log and the map.
// Never expose a covert incident's source before its detection mechanic does.
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const contained=a=>a.quarantined||a.locked||['isolated','responding'].includes(a.state);
export function activeThreats(game){
 const rows=[];
 for(const a of game.assets.values()){
  if(a.leak?.active){const known=a.leak.detected&&a.discovered,working=a.job?.programme==='leak-clean';rows.push({id:`leak-${known?a.id:'unknown'}`,kind:'leak',label:'Data leakage',state:working?'investigating':contained(a)?'contained':'active',assetId:known?a.id:null,source:known?a.name:'Source unknown',next:!known?'Deploy Data loss monitoring to trace the source.':working?'Collector removal and credential rotation in progress.':contained(a)?'Remove the collector; containment is not cleanup.':'Quarantine egress, then remove the collector.',action:known?'select':'threat-program',actionId:known?a.id:'Detect',actionLabel:known?'Open asset':'Find source'});}
  if(!a.discovered)continue;
  if(a.supplySource&&['compromised','responding'].includes(a.state))rows.push({id:`supply-${a.id}`,kind:'supply',label:'Supply-chain compromise',state:a.state==='responding'?'investigating':contained(a)?'contained':'active',assetId:a.id,source:a.name,next:a.state==='responding'?'Engineer removing the poisoned update.':contained(a)?'Remove the intruder to stop future internal waves.':'Quarantine; this source emits malware every wave until cleaned.',action:'select',actionId:a.id,actionLabel:'Open asset'});
  if(a.locked)rows.push({id:`ransom-${a.id}`,kind:'ransom',label:'Ransomware encryption',state:a.job?.kind==='ir'?'investigating':'active',assetId:a.id,source:a.name,next:a.job?'Recovery in progress; waves still continue.':'Fund Tested backups, then restore this system.',action:'select',actionId:a.id,actionLabel:'Restore system'});
  else if(['compromised','responding'].includes(a.state)&&!a.supplySource)rows.push({id:`infection-${a.id}`,kind:'infection',label:'Malware foothold',state:a.state==='responding'?'investigating':contained(a)?'contained':'active',assetId:a.id,source:a.name,next:contained(a)?'Remove the intruder; isolation alone is not cleanup.':'Quarantine and remove the intruder before it spreads.',action:'select',actionId:a.id,actionLabel:'Open asset'});
 }
 const humans=game.humanThreatStatus?.()||[];
 for(const h of humans){if(!['active','contained','investigating'].includes(h.state))continue;const a=h.assetId&&game.asset(h.assetId),known=h.detectedAt!=null&&a?.discovered;rows.push({id:String(h.id),kind:h.kind,label:known?(h.kind==='worker-fraud'?'DPRK-linked remote-worker fraud':'Insider threat'):'Unconfirmed workforce signal',state:h.state,assetId:known?a.id:null,source:known?a.name:'Source under review',next:!known?'Security awareness and SIEM accelerate verification.':h.state==='active'?'Suspend access and hold payments; then verify identity and evidence.':h.state==='investigating'?'Engineer verifying identity, access and evidence.':'Access revoked. Complete the review to close the incident.',human:true,cost:h.investigationCost??game.price?.(8)??8,seconds:h.investigationSeconds??25,known,canInvestigate:h.canInvestigate,reason:h.investigationReason});}
 return rows;
}
export function renderActiveThreats(rows,game,speed=1){
 const button=(action,id,label,disabled=false,title='')=>`<button data-action="${action}" data-id="${escape(id)}" ${disabled?'disabled':''} ${title?`title="${escape(title)}"`:''}>${escape(label)}</button>`;
 return `<section class="active-threats" aria-label="Open security incidents"><div class="active-threats-heading"><b>OPEN THREATS</b><span>${rows.length}</span></div>${rows.length?rows.map(r=>{
  let actions='';
  if(r.human){
   if(!r.known)actions=button('threat-program','Protect','Review prevention');
   else if(r.state==='active')actions=button('human-contain',r.id,'Revoke access · free');
   else if(r.state==='contained'){const host=[...game.assets.values()].some(a=>a.discovered&&a.state==='ok'&&!a.locked&&!a.quarantined&&!a.job);const reason=r.reason||(game.budget<r.cost?'Not enough budget':game.activeJobs()>=game.concurrency()?'All engineers busy':!host?'Restore an available system for evidence collection':'');actions=button('human-investigate',r.id,`Verify & close · $${Math.round(r.cost)}k · ~${Math.ceil(r.seconds/(.75*Math.max(1,speed)))}s`,r.canInvestigate===false||!!reason,reason)+`<small class="incident-cost">1 engineer${reason?` · ${escape(reason)}`:''}</small>`;}
   if(r.assetId)actions+=button('select',r.assetId,'Locate');
  }else actions=button(r.action,r.actionId,r.actionLabel);
  return `<article class="active-threat ${r.state}" id="incident-${escape(r.id)}"><div><b>${escape(r.label)}</b><span class="incident-tag ${r.state}">${escape(r.state)}</span></div><small>${escape(r.source)}</small><p>${escape(r.next)}</p><div class="incident-actions">${actions}</div></article>`;
 }).join(''):'<p class="threats-clear">No open incidents. Incoming waves can still threaten the company.</p>'}</section>`;
}
