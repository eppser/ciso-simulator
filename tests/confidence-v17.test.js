import { it, expect } from 'vitest';
import { Campaign } from '../src/sim/campaign.js';
import { ORGS } from '../src/sim/orgs.js';
import { BUILTIN_DAYS, scenarioModel } from '../src/sim/scenarios.js';
import { LineShuffle } from '../src/audio/random-lines.js';
import { tickBanter } from '../src/sim/banter.js';
import { LINES, VARIANTS } from '../src/audio/dialogue.js';
import { utilityLabel } from '../src/ui/utilities.js';
const mk = org => new Campaign({ model: scenarioModel(BUILTIN_DAYS[0]), org: ORGS[org], seed: 42 });
it.each(Object.keys(ORGS))('%s starts with full trust, zero score, and can lose and regain confidence', org => {
  const g = mk(org); expect(g.trust).toBe(5); expect(g.score()).toBe(0);
  g.hour = 4; g.tickGrc(); g.time = g.grc[0].deadline + 1; g.tickGrc();
  expect(g.trust).toBe(4); g.tickGrc(); expect(g.trust).toBe(4);
  g.budget = 1000; expect(g.buy('briefing').ok).toBe(true);
  g.time += 25; g.tickJobs(25); expect(g.trust).toBe(5);
});
it('shuffles every take before repeating and avoids repeats at bag boundaries', () => {
  for (const random of [()=>0,()=>.4,()=>.999]) {
    const bag = new LineShuffle(random), results = Array.from({length:12},()=>bag.pick('x',['a','b','c']));
    for(let i=0;i<12;i+=3)expect(new Set(results.slice(i,i+3)).size).toBe(3);
    for(let i=1;i<12;i++)expect(results[i]).not.toBe(results[i-1]);
  }
  expect(new LineShuffle().pick('only',['a'])).toBe('a');
});
it('randomizes conversation timing without consuming gameplay RNG', () => {
  const a=mk('startup'),b=mk('startup');tickBanter(a,()=>0);tickBanter(b,()=>.9);
  expect(a.flags.banterSchedule).not.toEqual(b.flags.banterSchedule);
  expect(a.rng.int(0,10000)).toBe(b.rng.int(0,10000));
});
it('succession joke is low-trust only and occurs at most once per day', () => {
  const g=mk('startup');g.messages=[];tickBanter(g);expect(g.messages).toHaveLength(0);
  g.trust=1;tickBanter(g);tickBanter(g);expect(g.messages.filter(m=>m.id==='succession')).toHaveLength(1);
  g.trust=5;tickBanter(g);g.trust=0;tickBanter(g);expect(g.messages.filter(m=>m.id==='succession')).toHaveLength(1);
});
it('no succession speech after a terminal outcome',()=>{
  const g=mk('startup');g.phase='lost';g.trust=0;g.messages=[];tickBanter(g);
  expect(g.messages.some(m=>m.id==='succession')).toBe(false);
});
it('new jokes and promotion are registered with appropriate casts',()=>{
  for(const id of ['head_intro','review','agency_intro','succession'])expect(VARIANTS[id].length).toBeGreaterThanOrEqual(3);
  for(const id of VARIANTS.promotion)expect(LINES[id].text).toContain('five out of five');
  for(const id of VARIANTS.succession)expect(LINES[id].speaker).toBe('engineer');
});
it('all utility icons share accessible decorative SVG markup',()=>{
  for(const icon of ['governance','sound','muted','help','menu']){
    const html=utilityLabel(icon,'Test');expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('stroke-width="1.7"');expect(html).not.toContain('undefined');
  }
});
