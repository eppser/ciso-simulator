import * as THREE from 'three';
import {updateInstances} from './buffers.js';
const MAX=600,dummy=new THREE.Object3D(),rootMatrix=new THREE.Matrix4(),local=new THREE.Matrix4();
export class AttackerLayer {
 constructor(scene,models){this.scene=scene;this.pools={};
  for(const name of ['virus','beetle','worm','boss','aithreat']){this.pools[name]=[];models[name].traverse(o=>{if(!o.isMesh)return;const mesh=new THREE.InstancedMesh(o.geometry,o.material,MAX);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;scene.add(mesh);this.pools[name].push({mesh,part:o.name,leg:/leg(\d)([LR])/.exec(o.name),segment:/segment(\d)/.exec(o.name),orbit:o.name.startsWith('orbit'),nucleus:o.name.startsWith('nucleus')});});}
  this.rings=new THREE.InstancedMesh(new THREE.RingGeometry(.30,.315,24),new THREE.MeshBasicMaterial({color:0xff4936,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}),MAX);this.rings.frustumCulled=false;scene.add(this.rings);
  this.bars=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,.055),new THREE.MeshBasicMaterial({color:0xf0a26d,depthTest:false}),MAX);this.bars.frustumCulled=false;scene.add(this.bars);
 }
 sync(game,time,cameraQuat){const counts={virus:0,beetle:0,worm:0,boss:0,aithreat:0};let n=0,bars=0;
  for(const a of game.attackers){if(!a.alive||n>=MAX)continue;
   const type=a.aiThreat?'aithreat':a.boss?'boss':a.kind==='lateral'?'worm':a.avatar|| (a.web?'virus':'beetle'),index=counts[type]++,scale=a.boss?1.8:a.kind==='lateral'?.85:.78;
   const dx=a.credential?a.x-(a.renderX??a.x):a.nx-a.x,dy=a.credential?a.y-(a.renderY??a.y):a.ny-a.y;if(Math.hypot(dx,dy)>.001)a.heading=Math.atan2(dx,dy);a.renderX=a.x;a.renderY=a.y;
   const clock=game.time*8+a.id*1.37,breach=!!a.breaching;
   const floating=type==='virus'||type==='boss'||type==='aithreat';
   dummy.position.set(a.x,.015+(floating?Math.sin(clock*.35)*.035:breach?Math.sin(clock*2)*.015:0),a.y);dummy.rotation.set(floating?Math.sin(clock*.17)*.08:0,(a.heading||0)+(floating?clock*.075:0),0);dummy.scale.setScalar(scale);dummy.updateMatrix();rootMatrix.copy(dummy.matrix);
   for(const {mesh,part,leg,segment,orbit,nucleus} of this.pools[type]){
    if(!leg&&!segment&&!orbit&&!nucleus){mesh.setMatrixAt(index,rootMatrix);continue;}
    dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);
    if(leg){const phase=clock+Number(leg[1])*Math.PI*.82+(leg[2]==='L'?0:Math.PI),side=leg[2]==='L'?-1:1;dummy.rotation.y=Math.sin(phase)*.15;dummy.rotation.z=Math.max(0,Math.sin(phase))*.22*side;dummy.position.y=Math.max(0,Math.sin(phase))*.025;}
    if(orbit){dummy.rotation.y=clock*(part.includes('0')?.11:-.08);}
    if(nucleus)dummy.scale.setScalar(1+Math.sin(clock*.6)*.06);
    if(segment){const phase=clock*.8-Number(segment[1])*.65;dummy.position.x=Math.sin(phase)*.055;dummy.rotation.y=Math.cos(phase)*.09;}
    dummy.updateMatrix();local.multiplyMatrices(rootMatrix,dummy.matrix);mesh.setMatrixAt(index,local);
   }
   dummy.position.set(a.x,.008,a.y);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(scale*(breach?1.25:1));dummy.updateMatrix();this.rings.setMatrixAt(n++,dummy.matrix);
   if(a.revealed||a.hp<a.maxHp||breach){dummy.position.set(a.x,(floating?1.2:.82)*scale,a.y);dummy.quaternion.copy(cameraQuat);dummy.scale.set(.6*scale*Math.max(0,a.hp/a.maxHp),1,1);dummy.updateMatrix();this.bars.setMatrixAt(bars++,dummy.matrix);}
  }
  for(const name in this.pools)for(const {mesh}of this.pools[name])updateInstances(mesh,counts[name]);
  updateInstances(this.rings,n);updateInstances(this.bars,bars);
 }
 pick(game,x,y){return game.attackers.filter(a=>a.alive&&Math.hypot(a.x-x,a.y-y)<(a.boss?.8:.5)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];}
}
