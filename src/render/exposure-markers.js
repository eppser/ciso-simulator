import * as THREE from 'three';
import {assetExposure} from '../ui/asset-exposure.js';
import {roundRect} from './text.js';

// One reusable label and footprint bracket mesh per discovered building. No extra lights.
export class ExposureMarkers{
 constructor(scene){this.scene=scene;this.entries=new Map();this.point=new THREE.Vector3();this.lastRefresh=-Infinity;this.records=[];}
 make(id){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=228;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.renderOrder=23;sprite.visible=false;sprite.userData.noReflection=true;this.scene.add(sprite);
  const pts=[];for(const x of [-1,1])for(const z of [-1,1]){pts.push(x*1.18,.04,z*.72,x*1.18,.04,z*1.18,x*1.18,.04,z*1.18,x*.72,.04,z*1.18,x*1.18,.04,z*1.18,x*1.18,.48,z*1.18);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const brackets=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffaf69,transparent:true,opacity:.9,depthWrite:false}));brackets.userData.noReflection=true;brackets.userData.noAO=true;brackets.visible=false;this.scene.add(brackets);
  const e={canvas,texture,sprite,brackets,text:'',id};this.entries.set(id,e);return e;
 }
 draw(e,a,r){
  const text=a.name+' · '+(r.state==='stale'?'↻':r.count+' !');
  if(text===e.text)return;e.text=text;
  const c=e.canvas.getContext('2d');e.texture.repeat.y=90/228;e.texture.offset.y=1-90/228;
  c.clearRect(0,0,768,228);c.fillStyle='rgba(8,14,21,.88)';roundRect(c,1,1,766,88,12);c.fill();
  c.fillStyle=r.color;c.fillRect(2,14,5,62);c.font='600 46px Inter, sans-serif';
  let name=a.name;while(name.length>5&&c.measureText(name).width>570)name=name.slice(0,-1);
  c.fillStyle='#edf1f5';c.fillText(name+(name!==a.name?'…':''),20,61);
  c.fillStyle=r.color;c.textAlign='right';c.fillText(r.state==='stale'?'↻':r.count+' !',746,61);c.textAlign='left';
  e.texture.needsUpdate=true;
 }
 update(game,camera,views,selected,time,labels){
  if(this.game!==game){this.clear();this.game=game;}
  if(time-this.lastRefresh>.2){this.lastRefresh=time;this.records=[...game.assets.values()].filter(a=>a.discovered).map(a=>({a,r:assetExposure(game,a)}));}
  for(const e of this.entries.values()){e.sprite.visible=false;e.brackets.visible=false;}
  const occupied=[];
  const records=[...this.records].sort((x,y)=>Number(y.a.id===selected?.id)-Number(x.a.id===selected?.id)||y.r.priority-x.r.priority);
  for(const {a,r}of records){const v=views.get(a.id);if(!v)continue;const active=['vulnerable','stale'].includes(r.state);if(!active)continue;
   const e=this.entries.get(a.id)||this.make(a.id);e.brackets.position.set(a.x+.5,0,a.y+.5);e.brackets.material.color.set(r.color);
   e.brackets.visible=true;e.brackets.material.opacity=.58+Math.sin(time*2.8)*.18;
   // A selection always shows details. Labels-off keeps the tactical footprint but hides text.
   if(!labels&&a.id!==selected?.id)continue;
   const height=v.height+.58;this.point.set(a.x+.5,height,a.y+.5).applyMatrix4(camera.matrixWorldInverse);const depth=-this.point.z;
   this.point.set(a.x+.5,height,a.y+.5).project(camera);if(depth<=0||Math.abs(this.point.x)>.98||Math.abs(this.point.y)>.93||this.point.z>1)continue;
   const px=(this.point.x+1)*innerWidth/2,py=(1-this.point.y)*innerHeight/2;
   const w=150,h=w*90/768;
   const overlaps=occupied.some(([x,y,ow,oh])=>Math.abs(x-px)<(w+ow)/2+6&&Math.abs(y-py)<(h+oh)/2+6);
   if(overlaps)continue;
   occupied.push([px,py,w,h]);v.marker.visible=false;const perPixel=2*depth*Math.tan(camera.fov*Math.PI/360)/innerHeight;
   e.sprite.position.set(a.x+.5,height,a.y+.5);e.sprite.scale.set(w*perPixel,h*perPixel,1);e.sprite.visible=true;this.draw(e,a,r);
  }
 }
 clear(){for(const e of this.entries.values()){this.scene.remove(e.sprite,e.brackets);e.texture.dispose();e.sprite.material.dispose();e.brackets.geometry.dispose();e.brackets.material.dispose();}this.entries.clear();this.records=[];this.lastRefresh=-Infinity;}
}
