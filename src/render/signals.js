import * as THREE from 'three';
import {updateInstances,updateVertices} from './buffers.js';
const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();
// Batched overlays: capability links and incident markers, not additional point lights.
export class CampusSignals {
 constructor(group){
  this.group=new THREE.Group();group.add(this.group);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6000),3));geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(6000),3));geo.setDrawRange(0,0);
  this.wires=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false}));this.wires.frustumCulled=false;this.group.add(this.wires);
  this.beams=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.018,1,5),new THREE.MeshBasicMaterial({color:0xfdb174,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}),256);this.beams.frustumCulled=false;this.group.add(this.beams);
  this.bits=new THREE.InstancedMesh(new THREE.BoxGeometry(.065,.085,.065),new THREE.MeshStandardMaterial({color:0xffbb71,emissive:0xff8734,emissiveIntensity:2,metalness:.5,roughness:.2}),512);this.bits.frustumCulled=false;this.group.add(this.bits);
  this.markers=new THREE.InstancedMesh(new THREE.RingGeometry(1.18,1.23,48),new THREE.MeshBasicMaterial({transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),128);this.markers.frustumCulled=false;this.group.add(this.markers);
  this.columns=new THREE.InstancedMesh(new THREE.CylinderGeometry(.6,1.1,4,20,1,true),new THREE.MeshBasicMaterial({color:0xff3b30,transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),40);this.columns.frustumCulled=false;this.group.add(this.columns);
 }
 update(game){
  const time=game.time,pos=this.wires.geometry.attributes.position,col=this.wires.geometry.attributes.color;let n=0,beam=0,bits=0,marker=0,columns=0;
  const line=(a,b,color)=>{if(n+2>pos.count)return;pos.setXYZ(n,...a);col.setXYZ(n++,...color);pos.setXYZ(n,...b);col.setXYZ(n++,...color);};
  const identity=game.asset(game.identityId),hub=[identity?.x+.5||20,.10,identity?.y+.5||14];
  const ring=(a,color,scale=1)=>{if(marker>=128)return;dummy.position.set(a.x+.5,.06,a.y+.5);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(scale);dummy.updateMatrix();this.markers.setMatrixAt(marker,dummy.matrix);this.markers.setColorAt(marker++,new THREE.Color(color));};
  for(const a of game.assets.values()){
   if(!a.discovered)continue;const x=a.x+.5,z=a.y+.5;
   if(game.has('mfa')){const c=a.quarantined||a.state!=='ok'?[.4,.25,.15]:[.95,.55,.22];line(hub,[hub[0],.10,z-.20],c);line([hub[0],.10,z-.20],[x,.10,z-.20],c);line([x,.10,z-.20],[x,.5,z],c);}
   if(game.has('awareness')){const c=[.22,.65,.64];line([19,.12,20],[x+.2,.12,20],c);line([x+.2,.12,20],[x+.2,.12,z],c);line([x+.2,.12,z],[x+.2,.55,z],c);}
   if(a.quarantined)ring(a,0x87cdec,1.08);else if(a.supplySource)ring(a,0xff734d,1.05+Math.sin(time*4)*.08);else if(a.restricted)ring(a,0xd6bb86);else if(game.has('backups'))ring(a,0x689e84,.99);
   if(a.scannedAt!=null&&time-a.scannedAt<3)ring(a,0xe0dec0,1+(time-a.scannedAt)*.15);
   if(a.crit===3&&(a.locked||a.quarantined||['compromised','down','responding'].includes(a.state))&&columns<40){dummy.position.set(x,2,z);dummy.rotation.set(0,time*.08,0);dummy.scale.setScalar(1);dummy.updateMatrix();this.columns.setMatrixAt(columns++,dummy.matrix);ring(a,0xff4936,1.15+Math.sin(time*3)*.08);}
  }
  for(const a of game.assets.values())if(a.leak?.active&&!a.quarantined&&!a.locked&&!['isolated','responding'].includes(a.state)){
   // Prior to DLP, show only an anonymous outbound stream at the boundary.
   const x=a.leak.detected?a.x+.5:31,z=a.leak.detected?a.y+.5:11;
   for(let i=0;i<32&&bits<512;i++){const p=(time*.23+i/32)%1;dummy.position.set(x+Math.sin(i*13+p*4)*.22,1+p*6,z+Math.cos(i*17+p*3)*.22);dummy.rotation.set(p*4,i,p*3);dummy.scale.setScalar(1.2-p*.5);dummy.updateMatrix();this.bits.setMatrixAt(bits++,dummy.matrix);}
  }
  for(const t of game.towers)if(t.type==='waf')for(const id of t.beams||[]){const a=game.attackers.find(a=>a.id===id&&a.alive);if(!a||beam>=256)continue;const start=new THREE.Vector3(t.x,1.08,t.y),end=new THREE.Vector3(a.x,.28,a.y);dir.subVectors(end,start);const length=dir.length();dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,dir.normalize());dummy.scale.set(1+Math.sin(time*30+id)*.15,length,1);dummy.updateMatrix();this.beams.setMatrixAt(beam++,dummy.matrix);}
  this.wires.geometry.setDrawRange(0,n);this.wires.visible=n>0;updateVertices(pos,n);updateVertices(col,n);
  for(const [mesh,count]of [[this.beams,beam],[this.bits,bits],[this.markers,marker],[this.columns,columns]])updateInstances(mesh,count);
 }
}
