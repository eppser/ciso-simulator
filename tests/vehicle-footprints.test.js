import {describe,it,expect} from 'vitest';
import {footprintCells,cellToken,claimVehicleFootprint,SECURITY_OPERATIONS_CELLS} from '../src/sim/footprints.js';
import {GridMap,inBounds} from '../src/sim/grid.js';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
const rect=(x,z,w=.6,d=.96)=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
describe('exclusive vehicle footprints',()=>{
 it('checks all covered cells, not just the center',()=>{
  const map=new GridMap();map.block(6,5,1);
  expect(claimVehicleFootprint(rect(5.4,5),map,new Set(),new Set())).toBe(false);
  expect(footprintCells(rect(5.4,5))).toEqual([[5,5],[6,5]]);
 });
 it('removes a parked car when a wall or tower claims any part of its footprint',()=>{
  for(const kind of [2,3]){const map=new GridMap(),claimed=new Set();expect(claimVehicleFootprint(rect(5.4,5),map,new Set(),claimed)).toBe(true);map.block(6,5,kind);expect(claimVehicleFootprint(rect(5.4,5),map,new Set(),new Set())).toBe(false);}
 });
 it('does not allow two cars to share even part of a tile',()=>{
  const map=new GridMap(),claimed=new Set();expect(claimVehicleFootprint(rect(4,5),map,new Set(),claimed)).toBe(true);
  expect(claimVehicleFootprint(rect(4.7,5),map,new Set(),claimed)).toBe(false);
  expect(claimVehicleFootprint(rect(6,5),map,new Set(),claimed)).toBe(true);
 });
 it('respects rendered building extensions and the off-grid SOC edge',()=>{
  const map=new GridMap(),structure=new Set(SECURITY_OPERATIONS_CELLS.map(([x,z])=>cellToken(x,z)));
  expect(claimVehicleFootprint(rect(18,21.1,.96,.6),map,structure,new Set())).toBe(false);
  expect(claimVehicleFootprint(rect(20,21.1,.96,.6),map,structure,new Set())).toBe(false);
  structure.add(cellToken(6,5));expect(claimVehicleFootprint(rect(6,5),map,structure,new Set())).toBe(false);
 });
 it('does not alias off-grid cells to the next grid row or treat touching edges as overlap',()=>{
  const map=new GridMap();map.block(0,1,1);
  expect(claimVehicleFootprint(rect(30,0),map,new Set(),new Set())).toBe(true);
  expect(footprintCells({minX:3.5,maxX:4.5,minZ:3.5,maxZ:4.5})).toEqual([[4,4]]);
 });
 it.each(Object.keys(ORGS))('%s reserves every in-map Security Operations tile for buildings and rogue devices',org=>{
  const g=new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],seed:1});g.budget=1000;
  for(const [x,z]of SECURITY_OPERATIONS_CELLS.filter(([x,z])=>inBounds(x,z))){
   expect(g.map.isFree(x,z)).toBe(false);expect(g.canPlace('wall',x,z).ok).toBe(false);
   expect(g.canPlace('ips',x,z).ok).toBe(false);
  }
 });
});
