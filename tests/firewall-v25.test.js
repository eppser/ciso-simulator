import {it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel,daySeed} from '../src/sim/scenarios.js';
import {recordRun,verifyReplay,STEP,SCENARIO} from '../src/sim/replay.js';
import {GridMap,key} from '../src/sim/grid.js';
const mk=org=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[org],seed:daySeed(SCENARIO)});
it.each(['startup','midcap','enterprise'])('%s keeps twenty segments affordable and charges exactly the quote',org=>{
 const g=mk(org),price={startup:3,midcap:4,enterprise:6}[org],initial=g.budget;g.map=new GridMap();
 for(let y=0;y<20;y++){expect(g.buildCost('wall')).toBe(price);expect(g.place('wall',13,y).ok).toBe(true);expect(g.walls.get(key(13,y)).paid).toBe(price);}
 expect(g.stats.spent).toBe(price*20);expect(g.budget).toBe(initial+g.stats.earned-price*20);expect(g.buildCost('wall')).toBe(price);
 expect(g.budget).toBeGreaterThanOrEqual(g.programCost('scanner'));
});
it.each(['startup','midcap','enterprise'])('%s can redesign routes instantly without refund farming',org=>{
 const g=mk(org);g.map=new GridMap();const initial=g.budget,price=g.buildCost('wall');g.lastSale=g.time;
 for(let i=0;i<12;i++){expect(g.place('wall',13,10).ok).toBe(true);const r=g.removeWall(13,10);expect(r.ok).toBe(true);expect(r.refund).toBe(Math.floor(price/2));expect(g.map.isFree(13,10)).toBe(true);}
 expect(g.budget).toBe(initial+g.stats.earned-12*(price-Math.floor(price/2)));expect(g.lastSale).toBe(g.time);
 expect(g.score()).toBe(0);expect(g.removeWall(13,10).ok).toBe(false);
});
it('damaged segments return less, and a nearly destroyed wall cannot refund its rebuild',()=>{
 const g=mk('midcap');g.map=new GridMap();g.place('wall',13,10);const w=g.walls.get(key(13,10));w.maxHp=180;w.hp=90;expect(g.wallRefund(w)).toBe(1);w.hp=1;expect(g.removeWall(13,10).refund).toBe(0);
});
it.each(['startup','midcap','enterprise'])('%s replay includes flat-price building, damage-aware refunds and route changes',org=>{
 const g=mk(org),run=recordRun(g);g.place('wall',29,0);g.removeWall(29,0);g.place('wall',29,1);g.place('wall',29,2);g.removeWall(29,1);g.buy('scanner');
 while(!['won','lost'].includes(g.phase)){g.tick(STEP);g.effects.length=0;g.popups.length=0;}
 const verified=verifyReplay(run);expect(verified.score).toBe(g.score());expect(verified.categories).toEqual(g.scoreBreakdown().map(c=>c.value));
},15000);
