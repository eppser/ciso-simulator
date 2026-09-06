import { describe,it,expect } from 'vitest';
import { GridMap,key,assetCells } from '../src/sim/grid.js';
import { advanceNetworkSources } from '../src/sim/movement.js';
import { Campaign } from '../src/sim/campaign.js';
import { ORGS } from '../src/sim/orgs.js';
import { BUILTIN_DAYS,scenarioModel } from '../src/sim/scenarios.js';
const mk=()=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS.startup,seed:20260902});
function fixture(){
 const target={id:'goal',x:20,y:10},map=new GridMap();for(const [x,y]of assetCells(target))map.block(x,y,1);
 const a={id:1,alive:true,x:4,y:11,cx:4,cy:11,nx:4,ny:11,age:0,speed:1,slow:1,targetId:'goal'};
 return {map,attackers:[a],walls:new Map(),towers:[],time:0,asset:id=>id==='goal'?target:null,effects:[],fx(type){this.effects.push(type);},log(){},arrive(a){a.alive=false;this.arrived=true;}};
}
function step(g,n){for(let i=0;i<n*30;i++){g.time+=1/30;advanceNetworkSources(g,1/30);}}
function wall(g,x,y){g.map.block(x,y,3);g.walls.set(key(x,y),{x,y});}
describe('production movement invariants',()=>{
 it('finishes a route instead of stalling at the target door',()=>{const g=fixture();step(g,30);expect(g.arrived).toBe(true);expect(g.attackers).toHaveLength(0);});
 it('takes an open detour without damaging a wall',()=>{const g=fixture();for(let y=2;y<20;y++)wall(g,10,y);step(g,50);expect(g.arrived).toBe(true);expect(g.walls.size).toBe(18);expect(g.effects).not.toContain('barrier-hit');});
 it('breaches a completely sealed route and then reaches the target',()=>{const g=fixture();for(let y=0;y<22;y++)wall(g,10,y);step(g,50);expect(g.arrived).toBe(true);expect(g.walls.size).toBe(21);expect(g.effects).toContain('barrier-break');});
 it('can destroy a blocking tower as well as a firewall',()=>{const g=fixture();for(let y=0;y<22;y++){g.map.block(10,y,2);g.towers.push({id:y,x:10,y,type:'ips'});}step(g,50);expect(g.arrived).toBe(true);expect(g.towers).toHaveLength(21);});
 it('handles a mid-edge topology change without walking through the obstacle',()=>{const g=fixture();step(g,.4);const a=g.attackers[0];wall(g,a.nx,a.ny);step(g,1);expect(g.effects).toContain('barrier-hit');expect(a.cx).toBe(4);step(g,40);expect(g.arrived).toBe(true);});
 it('visibly withdraws when every target is gone',()=>{const g=fixture();g.attackers[0].targetId=null;step(g,8);expect(g.attackers).toHaveLength(0);expect(g.arrived).toBeFalsy();});
 it('recovers from a zero slow factor',()=>{const g=fixture();g.attackers[0].slow=0;step(g,40);expect(g.arrived).toBe(true);});
 it('reserves the next tile during placement',()=>{const g=mk();g.budget=10000;g.attackers=[{alive:true,cx:7,cy:3,nx:8,ny:3,x:7.4,y:3}];expect(g.canPlace('wall',8,3).ok).toBe(false);expect(g.canPlace('wall',7,3).ok).toBe(false);});
 it('queues every encrypted asset across limited engineer capacity',()=>{const g=mk();g.concurrency=()=>1;g.budget=10000;g.attackers=[];g.programmes.add('backups');const assets=[...g.assets.values()].filter(a=>a.discovered).slice(0,3);for(const a of assets){a.locked=true;a.state='compromised';a.integrity=0;}g.flags.ransomPrice=33;g.queueDilemma('ransom',assets[0].id,true);expect(g.choose(g.pendingDilemma.id,'rebuild').ok).toBe(true);expect(g.jobs).toHaveLength(1);expect(g.recoveryQueue).toHaveLength(2);for(let i=0;i<500;i++){g.time++;g.tickJobs(1);g.dispatchRecovery();}expect(assets.every(a=>!a.locked)).toBe(true);expect(g.recoveryQueue).toHaveLength(0);});
});
