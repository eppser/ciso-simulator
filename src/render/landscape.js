import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { softRectTexture,radialTexture,concreteMaps,tex } from './textures.js';
export function perimeterTrees(){
 const root=new THREE.Group(),branches=[],dummy=new THREE.Object3D(),count=36*210;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='white';c.beginPath();c.moveTo(32,2);c.bezierCurveTo(4,19,6,48,32,62);c.bezierCurveTo(58,43,59,22,32,2);c.fill();
 const alpha=new THREE.CanvasTexture(canvas),leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.08,.14),new THREE.MeshStandardMaterial({color:0x4c5942,roughness:.83,alphaMap:alpha,alphaTest:.5,side:THREE.DoubleSide}),count);leaves.castShadow=true;leaves.receiveShadow=true;
 const rod=(a,b,r)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r*.6,r,start.distanceTo(end),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());branches.push(g);};
 for(let i=0;i<36;i++){const x=3+(i%18)*1.5,z=i<18?-1.35:22.35;rod([x,0,z],[x+.02,.66,z],.025);
  for(let j=0;j<7;j++){const a=j*2.4+i,dx=Math.sin(a)*.22,dz=Math.cos(a)*.22;rod([x,.23+j*.045,z],[x+dx,.55+j*.032,z+dz],.011);}
  for(let j=0;j<210;j++){const theta=j*2.399963,vertical=Math.sin(j*37.19),r=Math.sqrt(1-vertical*vertical)*(.18+.12*Math.abs(Math.sin(j*18.3)));dummy.position.set(x+Math.cos(theta)*r,.63+vertical*.30,z+Math.sin(theta)*r);dummy.rotation.set(j*.73,j*1.31,j*2.2);dummy.scale.setScalar(.65+Math.abs(Math.sin(j*3))*.6);dummy.updateMatrix();leaves.setMatrixAt(i*210+j,dummy.matrix);}
 }
 const trunk=new THREE.Mesh(mergeGeometries(branches),new THREE.MeshStandardMaterial({color:0x393029,roughness:.95}));branches.forEach(g=>g.dispose());trunk.castShadow=true;root.add(trunk,leaves);return root;
}
// Non-blocking landscape and architectural contact detail stays inside/along the
// authored asset footprints. It never changes the collision map or hides a route.
export function dressCampus(game){
 const group=new THREE.Group(),curbs=[],paving=[],paint=[],planters=[],glows=[],shadows=[],foliage=[];
 const box=(list,w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);list.push(g);};
 const flat=(list,w,d,x,y,z)=>{const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate(x,y,z);list.push(g);};
 for(const a of game.assets.values()){
  if(!a.discovered)continue;
  const x=a.x+.5,z=a.y+.5;
  flat(shadows,3.5,3.5,x,.006,z);
  for(const side of [-1,1]){
   box(paving,2.45,.015,.20,x,.007,z+side*1.10);
   box(paving,.20,.015,2.3,x+side*1.10,.007,z);
   box(curbs,2.48,.045,.025,x,.014,z+side*1.21);
   box(curbs,.025,.045,2.4,x+side*1.21,.014,z);
   box(planters,.11,.16,.65,x+side*.94,.10,z+.38);
   for(let j=0;j<45;j++)foliage.push([x+side*.94+Math.sin(j*57)*.09,.22+Math.abs(Math.sin(j*13))*.17,z+.10+(j/45)*.57]);
   flat(glows,.8,.65,x+side*.60,.016,z-1.02);
   for(let j=0;j<9;j++)box(curbs,.012,.016,.18,x-.98+j*.24,.02,z+side*1.10);
  }
  // Service-apron markings and parking bays on adjacent free tiles.
  for(let dx=0;dx<3;dx++){const px=a.x-1+dx,pz=a.y+3;if(!game.map.isFree(px,pz)||!game.map.isFree(px,pz-1))continue;
   flat(paint,.012,.65,px-.35,.012,pz);flat(paint,.012,.65,px+.35,.012,pz);flat(paint,.7,.012,px,.013,pz+.32);
  }
 }
 const c=concreteMaps();
 const lit=[...game.assets.values()].filter(a=>a.discovered);for(let i=0;i<4;i++){const a=lit[Math.floor(i*Math.max(1,lit.length-1)/3)];const light=new THREE.PointLight(0xffc184,a?5:0,3.5,2);light.position.set(a?a.x+.5:0,.45,a?a.y+1.5:0);group.add(light);}
 const materials=[new THREE.MeshStandardMaterial({color:0x454b50,roughness:.7,map:tex(c.albedo,{srgb:true})}),new THREE.MeshStandardMaterial({color:0x63686c,roughness:.72,map:tex(c.albedo,{srgb:true,repeat:5})}),new THREE.MeshStandardMaterial({color:0xafa995,roughness:.7}),new THREE.MeshStandardMaterial({color:0x242b2b,roughness:.8}),new THREE.MeshBasicMaterial({color:0xffbd70,map:radialTexture('white','transparent'),transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}),new THREE.MeshBasicMaterial({map:softRectTexture(),transparent:true,opacity:.65,depthWrite:false,color:0x000000})];
 [curbs,paving,paint,planters,glows,shadows].forEach((parts,i)=>{if(!parts.length)return;const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new THREE.Mesh(g,materials[i]);m.receiveShadow=true;m.castShadow=i===3;group.add(m);});
 const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=64;const ctx=leafCanvas.getContext('2d');ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(32,32,13,28,-.4,0,Math.PI*2);ctx.fill();const alpha=new THREE.CanvasTexture(leafCanvas);
 const leafGeo=new THREE.PlaneGeometry(.095,.16),leafmat=new THREE.MeshStandardMaterial({color:0x3e5038,roughness:.85,alphaMap:alpha,alphaTest:.45,side:THREE.DoubleSide});
 const leaves=new THREE.InstancedMesh(leafGeo,leafmat,foliage.length);leaves.castShadow=true;leaves.receiveShadow=true;const d=new THREE.Object3D();foliage.forEach((p,i)=>{d.position.set(...p);d.rotation.set(i*1.8,i*2.3,i*.81);d.scale.setScalar(.7+(i%9)*.08);d.updateMatrix();leaves.setMatrixAt(i,d.matrix);});group.add(leaves);
 group.userData.dispose=()=>{group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materials.forEach(m=>{m.map?.dispose();m.dispose();});leafmat.dispose();alpha.dispose();};return group;
}
