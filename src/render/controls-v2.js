import * as THREE from 'three';
import { copyAsset } from './asset-kit.js';
import { key } from '../sim/grid.js';
export function applyTowerTheme(){}
export function buildTower(t){const group=copyAsset(t.type);group.position.set(t.x,0,t.y);return {group,type:t.type,parts:group.children.filter(m=>m.name.includes('head_')),lastFired:t.fired||0,recoil:0};}
export function updateTowerView(v,t,time,game){
 // Blender -Y is GLTF +Z: the authored muzzle faces south, not north.
 const target=game.attackers.find(a=>a.alive&&a.id===t.target),angle=target?Math.atan2(target.x-t.x,target.y-t.y):t.type==='ndr'?time*.35:t.type==='ips'?-Math.PI/2:0;
 if(v.lastFired!==t.fired){v.recoil=1;v.lastFired=t.fired;}v.recoil*=.8;
 for(const part of v.parts){part.rotation.y=angle;part.position.x=Math.sin(angle)*v.recoil*.06;part.position.z=Math.cos(angle)*v.recoil*.06;}
 if(t.hp!=null&&t.hp<t.maxHp){v.group.rotation.z=Math.sin(time*30)*.005;}
}
export function buildWall(x,y){const group=copyAsset('wall');group.position.set(x,0,y);group.rotation.y=-Math.PI/2;return group;}
export function connectWalls(walls,views){for(const [k,w]of walls){const east=walls.has(key(w.x+1,w.y))||walls.has(key(w.x-1,w.y)),north=walls.has(key(w.x,w.y+1))||walls.has(key(w.x,w.y-1));views.get(k).rotation.y=east&&!north?0:-Math.PI/2;}}
