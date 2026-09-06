import { GRID, key, inBounds, assetDoors } from './grid.js';

const neighbors = (x,y) => [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([x,y])=>inBounds(x,y));
const caches = new WeakMap();
// Used only when a normal free route does not exist. Reverse Dijkstra gives
// every source a consistent route, preferring a detour to an expensive breach.
export function breachField(map, target) {
  let cache=caches.get(map);
  if(!cache||cache.revision!==map.revision){cache={revision:map.revision,fields:new Map()};caches.set(map,cache);}
  if(cache.fields.has(target.id))return cache.fields.get(target.id);
  const cost=k=>map.blocked[k]===3?25:map.blocked[k]===2?18:1;
  const d=new Float32Array(GRID.w*GRID.h).fill(Infinity),done=new Uint8Array(d.length);
  for(const [x,y] of assetDoors(target))if(map.blocked[key(x,y)]!==1)d[key(x,y)]=0;
  for(let iteration=0;iteration<d.length;iteration++){
    let u=-1,best=Infinity;
    for(let k=0;k<d.length;k++)if(!done[k]&&d[k]<best){best=d[k];u=k;}
    if(u<0)break;done[u]=1;
    for(const [x,y] of neighbors(u%GRID.w,Math.floor(u/GRID.w))){const k=key(x,y);if(map.blocked[k]===1)continue;d[k]=Math.min(d[k],best+cost(u));}
  }
  cache.fields.set(target.id,d);return d;
}

export function advanceNetworkSources(game,dt){
  for(const a of game.attackers){
    if(!a.alive||a.credential)continue;
    a.age+=dt;a.breaching=null;a.slow=Math.min(1,(Number.isFinite(a.slow)?a.slow:1)+dt*.5);
    const target=game.asset(a.targetId);
    if(!target){a.withdrawing=true;a.x-=Math.max(.6,a.speed)*dt;if(a.x<-.8)a.alive=false;continue;}
    // Recalculate at tile centers, never reverse halfway along a valid edge.
    if(a.cx===a.nx&&a.cy===a.ny){
      const field=game.map.field(target.id,assetDoors(target,game.map.blocked));
      a.dist=field[key(a.cx,a.cy)];
      if(a.dist===0){game.arrive(a);continue;}
      let next=game.map.step(field,a.cx,a.cy);
      if(!next){
        const d=breachField(game.map,target);
        next=neighbors(a.cx,a.cy).filter(([x,y])=>game.map.blocked[key(x,y)]!==1)
          .map(p=>({p,v:d[key(...p)]+(game.map.blocked[key(...p)]===3?25:game.map.blocked[key(...p)]===2?18:1)}))
          .filter(n=>Number.isFinite(n.v)).sort((l,r)=>l.v-r.v)[0]?.p;
      }
      if(!next){a.targetId=null;continue;}
      [a.nx,a.ny]=next;
    }
    const block=game.map.blocked[key(a.nx,a.ny)];
    if(block===2||block===3){
      const control=block===3?game.walls.get(key(a.nx,a.ny)):game.towers.find(t=>t.x===a.nx&&t.y===a.ny);
      if(control){
        control.maxHp??=block===3?180:120;control.hp??=control.maxHp;
        control.hp-=dt*(a.boss?34:18);a.breaching={x:a.nx,y:a.ny};
        if(game.time-(a.lastBreachFx??-1)>.35){a.lastBreachFx=game.time;game.fx('barrier-hit',a.nx,a.ny);}
        if(control.hp<=0){
          if(block===3)game.walls.delete(key(a.nx,a.ny));else game.towers=game.towers.filter(t=>t!==control);
          game.map.free(a.nx,a.ny);game.fx('barrier-break',a.nx,a.ny);game.log('An attacker breached a blocked route. Rebuild the control or cover the opening.','fail');
        }
        continue;
      }
      // An orphan collision cell must not permanently trap a source.
      game.map.free(a.nx,a.ny);
    }else if(block===1){a.nx=a.cx;a.ny=a.cy;continue;}
    const dx=a.nx-a.x,dy=a.ny-a.y,d=Math.hypot(dx,dy),step=Math.max(.05,a.speed*a.slow)*dt;
    if(d<=step){a.x=a.cx=a.nx;a.y=a.cy=a.ny;}else{a.x+=dx/d*step;a.y+=dy/d*step;}
  }
  game.attackers=game.attackers.filter(a=>a.alive);
}
