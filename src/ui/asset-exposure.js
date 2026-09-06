// Scanner knowledge only: never consult the asset's hidden current vulnerability set.
export function assetExposure(game,a){
 if(!a.discovered)return null;
 const findings=[...(a.knownVulns||[])].map(id=>{const v=game.vuln(id);const score=v?.cvss??null;
  return {id,displayId:id.replace(/ \/ row \d+$/,''),vendor:v?.vendor||'Unknown vendor',product:v?.product||a.product,score,scoreBasis:v?.scoreBasis||'unknown',kev:!!v?.kev,patchable:!!v?.patchable,fixHour:v?.patchable?game.fixHour(id):null};
 }).sort((a,b)=>(b.score??0)-(a.score??0)||Number(b.kev)-Number(a.kev)||a.id.localeCompare(b.id));
 const state=a.knownVulns===null?'unknown':a.scanStale?'stale':findings.length?'vulnerable':'clear';
 const incident=a.locked?'ENCRYPTED':['compromised','responding'].includes(a.state)?'COMPROMISED':a.state==='down'?'OFFLINE':null;
 const contained=!!(a.quarantined||a.restricted||a.state==='isolated');
 const highest=findings[0],critical=state==='vulnerable'&&highest?.score>=9;
 const color=incident?'#ff7468':state==='vulnerable'?critical?'#ff8b62':'#ffc064':state==='clear'?'#87dfb9':state==='stale'?'#e9c477':'#a3b1c4';
 const label=state==='unknown'?'UNSCANNED':state==='stale'?'RESCAN NEEDED':state==='clear'?'NO KNOWN VULNS':`${findings.length} OPEN · ${critical?'CRITICAL':'VULNERABLE'}`;
 const remedy=highest?!highest.patchable?'No patch · contain / replace':highest.fixHour!==null?`Patch at ${String(highest.fixHour).padStart(2,'0')}:00 · contain now`:a.job?'Engineer working':'Patch available':null;
 return {state,findings,count:state==='unknown'?null:findings.length,critical,incident,contained,color,label,remedy,priority:(incident?100:0)+(state==='vulnerable'?40:state==='stale'?25:0)+(a.exposed?8:0)+a.crit+(highest?.score||0),headline:incident?`${incident} · ${state==='unknown'?'SCAN UNKNOWN':`${findings.length} OPEN`}`:label};
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exposureSummary(game,a){
 const r=assetExposure(game,a);if(!r)return '';
 return `<div class="exposure-summary ${r.state}" style="--exposure-color:${r.color}"><b>${esc(r.label)}</b><p>${r.state==='unknown'?'Deploy a Scanner and allow it to inspect this system. Unknown is not safe.':r.state==='stale'?'The previous scan is out of date. Wait for a fresh scan; new findings remain unknown.':r.state==='clear'?'No known unpatched vulnerabilities in the current scan. This does not rule out malware, stolen accounts or future flaws.':`${r.count} known unpatched ${r.count===1?'vulnerability':'vulnerabilities'}. Select a fix below.`}${r.contained&&r.count?' Exposure is contained, but these flaws are not fixed.':''}</p></div>`;
}
export function findingMetadata(game,id){
 const v=game.vuln(id);if(!v)return '';
 return `<div class="finding-meta"><strong>${esc(v.vendor||'Unknown vendor')}</strong><span>${esc(v.product||'Unknown product')}</span><div>${v.cvss!=null?`<em>${v.scoreBasis==='shadowserver'?'Sensor score':'CVSS'} ${Number(v.cvss).toFixed(1)}</em>`:''}${v.kev?'<em>Known exploited · KEV</em>':''}<em>${v.web?'Web exploit · WAF':'Device exploit · IPS'}</em></div>${v.description?`<details><summary>Vulnerability details</summary><p>${esc(v.description)}</p></details>`:''}</div>`;
}
