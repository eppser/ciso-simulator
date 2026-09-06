import {it,expect} from 'vitest';
import {STREET_LABELS} from '../src/render/street-labels.js';
import {ZONES,GRID} from '../src/sim/grid.js';
it('paints each swimlane name within its actual zone and road length',()=>{
 expect(STREET_LABELS.map(l=>l.zone)).toEqual(['dmz','internal','core']);
 for(const label of STREET_LABELS){
  const zone=ZONES.find(z=>z.id===label.zone);
  expect(label.x-label.width/2).toBeGreaterThan(zone.x0-.5);
  expect(label.x+label.width/2).toBeLessThan(zone.x1+.5);
  expect(label.z-label.length/2).toBeGreaterThan(0);
  expect(label.z+label.length/2).toBeLessThan(GRID.h);
 }
 expect(STREET_LABELS[0].title).toContain('DMZ');
 expect(STREET_LABELS[2].title).toContain('CORE SYSTEMS');
});
