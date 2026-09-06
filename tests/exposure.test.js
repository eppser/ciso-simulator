import {describe,it,expect} from 'vitest';
import {assetExposure,exposureSummary,findingMetadata} from '../src/ui/asset-exposure.js';
import {Campaign} from '../src/sim/campaign.js';
import {scenarioModel,BUILTIN_DAYS} from '../src/sim/scenarios.js';
import {ORGS} from '../src/sim/orgs.js';
const mk=(org='startup')=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],mode:'full',seed:20260902});
const asset=()=>({id:'a',discovered:true,knownVulns:null,vulns:new Set(['SECRET']),crit:1,state:'ok',product:'Gateway'});
const fake={vuln:id=>({vendor:'Fortinet',product:'FortiOS',cvss:9.8,scoreBasis:'cvss',patchable:true,kev:true}),fixHour:()=>null};
describe('scanner knowledge and visual exposure',()=>{
 it('never reveals hidden findings or undiscovered assets',()=>{const a=asset();const g={...fake,vuln:()=>{throw Error('Hidden finding accessed');}};expect(assetExposure(g,a).findings).toEqual([]);expect(assetExposure(g,a).state).toBe('unknown');a.discovered=false;expect(assetExposure(g,a)).toBeNull();});
 it('shows real identifiers, vendor and severity without inventing CVEs',()=>{const a=asset();a.knownVulns=new Set(['CVE-2022-40684 / row 2']);const r=assetExposure(fake,a);expect(r.critical).toBe(true);expect(r.findings[0]).toMatchObject({vendor:'Fortinet',displayId:'CVE-2022-40684',id:'CVE-2022-40684 / row 2'});expect(findingMetadata(fake,'x')).toContain('CVSS 9.8');expect(findingMetadata(fake,'x')).toContain('Known exploited');});
 it('does not turn contained or EDR-protected flaws green',()=>{const a=asset();a.knownVulns=new Set(['CVE-1']);a.edr=true;a.quarantined=true;expect(assetExposure(fake,a).state).toBe('vulnerable');expect(exposureSummary(fake,a)).toContain('not fixed');});
 it('stale empty scans are not shown as clear',()=>{const a=asset();a.knownVulns=new Set();a.scanStale=true;expect(assetExposure(fake,a).state).toBe('stale');expect(exposureSummary(fake,a)).toContain('out of date');});
 it('keeps infection distinct from vulnerability scan results',()=>{const a=asset();a.knownVulns=new Set();a.locked=true;const r=assetExposure(fake,a);expect(r.incident).toBe('ENCRYPTED');expect(r.headline).toBe('ENCRYPTED · 0 OPEN');expect(exposureSummary(fake,a)).toContain('does not rule out malware');});
 it('supports missing scores and future/no-patch findings',()=>{const a=asset();a.knownVulns=new Set(['CUSTOM-1']);const g={...fake,vuln:()=>({patchable:false})};expect(assetExposure(g,a).findings[0].displayId).toBe('CUSTOM-1');expect(assetExposure(g,a).remedy).toBe('No patch · contain / replace');expect(findingMetadata(g,'x')).not.toContain('CVSS');expect(assetExposure({...fake,fixHour:()=>14},a).remedy).toContain('14:00');});
 it('escapes imported metadata',()=>{const g={...fake,vuln:()=>({vendor:'<img>',product:'<script>',description:'<script>alert(1)</script>'})};expect(findingMetadata(g,'x')).not.toContain('<script>');expect(findingMetadata(g,'x')).toContain('&lt;img&gt;');});
 it.each(Object.keys(ORGS))('%s reveals progressively after real Scanner rollout and clears completed patches',org=>{
  const g=mk(org);g.budget=1000;
  const a=[...g.assets.values()].find(a=>a.discovered&&a.vulns.size&&a.knownVulns===null);expect(assetExposure(g,a).state).toBe('unknown');g.tickScanner(5);expect(a.knownVulns).toBeNull();
  const initial=[...g.assets.values()].filter(a=>a.knownVulns!==null).length;expect(g.buy('scanner').ok).toBe(true);g.time=g.programReady.get('scanner');g.tickScanner(5);expect([...g.assets.values()].filter(a=>a.knownVulns!==null).length).toBe(initial+1);
  for(let i=0;i<g.assets.size;i++)g.tickScanner(5);expect(assetExposure(g,a).state).toBe('vulnerable');
  const target=[...g.assets.values()].find(a=>a.discovered&&[...a.knownVulns].some(id=>g.vuln(id).patchable&&g.fixHour(id)===null));
  const vid=[...target.knownVulns].find(id=>g.vuln(id).patchable&&g.fixHour(id)===null),before=target.knownVulns.size;
  expect(g.patch(target.id,vid).ok).toBe(true);expect(assetExposure(g,target).count).toBe(before);g.tickJobs(1000);expect(assetExposure(g,target).count).toBe(before-1);
  target.scanStale=true;g.tickScanner(5);expect(assetExposure(g,target).state).not.toBe('stale');
 });
});
