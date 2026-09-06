import * as THREE from 'three';

// These are paint on the longitudinal service roads, not camera-facing labels.
// X stays inside the corresponding simulation zone; the long axis follows Z.
export const STREET_LABELS = [
 {zone:'dmz',title:'01 / DMZ',subtitle:'PUBLIC SERVICES',x:7,z:10,length:6.4,width:.85},
 {zone:'internal',title:'02 / INTERNAL',subtitle:'BUSINESS SYSTEMS',x:14.2,z:10,length:6.4,width:.85},
 {zone:'core',title:'03 / CORE SYSTEMS',subtitle:'CRITICAL INFRASTRUCTURE',x:23.2,z:17,length:6.4,width:.85},
];

export function streetLabels(renderer){
 const group=new THREE.Group();group.name='Street swimlane names';
 for(const label of STREET_LABELS){
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#e2ded2';ctx.font='700 148px "Arial Narrow", Arial, sans-serif';
  ctx.fillText(label.title,768,92,1420);
  ctx.font='600 44px Arial, sans-serif';ctx.fillText(label.subtitle,768,205,1380);
  // Small, deterministic scuffs keep lettering embedded in the wet asphalt.
  ctx.globalCompositeOperation='destination-out';
  for(let i=0;i<900;i++){ctx.globalAlpha=.12+(i%4)*.07;ctx.fillRect((i*367)%1536,(i*113)%256,1+i%5,1+i%3);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const material=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,transparent:true,opacity:.82,roughness:.87,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const paint=new THREE.Mesh(new THREE.PlaneGeometry(label.length,label.width),material);
  paint.name=label.title;paint.userData.zone=label.zone;
  paint.rotation.set(-Math.PI/2,0,Math.PI/2);paint.position.set(label.x,.025,label.z);
  paint.receiveShadow=true;paint.renderOrder=2;group.add(paint);
 }
 return group;
}
