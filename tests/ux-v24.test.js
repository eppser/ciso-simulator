import {it,expect} from 'vitest';
import {normalizedPoints,DIFFICULTY} from '../src/sim/score-normalization.js';
import {PROGRAM_TRACKS,programTrack,operationTrack,canonicalTrack} from '../src/ui/program-taxonomy.js';
import {PROGRAMS} from '../src/sim/campaign-rules.js';
import {isMobileDevice} from '../src/mobile.js';
import {boardQuery} from '../server/validation.js';
it('uses six NIST functions with Actions as a separate shortcut',()=>{
 expect(PROGRAM_TRACKS).toEqual(['Actions','Govern','Identify','Protect','Detect','Respond','Recover']);
 for(const p of Object.values(PROGRAMS))expect([...PROGRAM_TRACKS,'Team']).toContain(programTrack(p));
 expect(programTrack(PROGRAMS.scanner)).toBe('Identify');expect(programTrack(PROGRAMS.mfa)).toBe('Protect');expect(programTrack(PROGRAMS.awareness)).toBe('Detect');expect(programTrack(PROGRAMS.comms)).toBe('Respond');
 expect(canonicalTrack('Visibility')).toBe('Identify');expect(canonicalTrack('Identity')).toBe('Protect');
 expect(operationTrack({id:'fbi-evidence',track:'Govern'})).toBe('Respond');
 expect(operationTrack({kind:'threat',track:'Protect'})).toBe('Respond');
});
it('defaults to one all-difficulty board and preserves scoped legacy requests',()=>{
 expect(boardQuery(new URL('https://game.test')).org).toBe('all');
 expect(boardQuery(new URL('https://game.test?org=enterprise')).org).toBe('enterprise');
});
it.each(Object.keys(DIFFICULTY))('scores %s monotonically without free progress or exceeding category limits',org=>{
 for(const max of [3000,4000])for(const p of [0,.1,.5,1]){
  let last=0;for(let i=0;i<=100;i++){const score=normalizedPoints(max,i/100,p,org);expect(score).toBeGreaterThanOrEqual(last);expect(score).toBeLessThanOrEqual(Math.round(max*p));last=score;}
  expect(normalizedPoints(max,0,p,org)).toBe(0);expect(normalizedPoints(max,1,p,org)).toBe(Math.round(max*p));
 }
});
it('makes the difficulty allowance explicit and bounded',()=>{
 expect(normalizedPoints(10000,.5,1,'startup')).toBe(5000);
 expect(normalizedPoints(10000,.5,1,'midcap')).toBe(5548);
 expect(normalizedPoints(10000,.5,1,'enterprise')).toBe(5946);
 expect(normalizedPoints(10000,.5,0,'enterprise')).toBe(0);
});
it.each(['iPhone','iPad','Android 15','Macintosh'])('gates mobile and touch iPad %s before loading the game',userAgent=>expect(isMobileDevice({userAgent,maxTouchPoints:5})).toBe(true));
it('does not mistake a narrow desktop browser or touchscreen laptop for mobile',()=>{
 expect(isMobileDevice({userAgent:'Macintosh',maxTouchPoints:0})).toBe(false);
 expect(isMobileDevice({userAgent:'Windows NT 10.0',maxTouchPoints:10})).toBe(false);
});
